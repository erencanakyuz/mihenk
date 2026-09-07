import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
export const secret = () => randomBytes(32).toString('base64url');
export const hash = value => createHash('sha256').update(value).digest('hex');
export function openStore(filename) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
  db.exec([
    "CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, initial TEXT NOT NULL, state TEXT NOT NULL);",
    "CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, join_code TEXT UNIQUE, run_id TEXT NOT NULL REFERENCES runs(id), actor_id TEXT NOT NULL, expires INTEGER NOT NULL, seen TEXT NOT NULL DEFAULT '[]');",
    "CREATE TABLE IF NOT EXISTS receipts(run_id TEXT NOT NULL, actor_id TEXT NOT NULL, command_id TEXT NOT NULL, digest TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(run_id,actor_id,command_id));",
    "CREATE TABLE IF NOT EXISTS events(run_id TEXT NOT NULL REFERENCES runs(id), seq INTEGER NOT NULL, record TEXT NOT NULL, PRIMARY KEY(run_id,seq));",
    "CREATE TABLE IF NOT EXISTS records(run_id TEXT NOT NULL REFERENCES runs(id), id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, record TEXT NOT NULL);",
    "PRAGMA user_version=1;"
  ].join('\n'));
  const store = {
    db,
    transaction(fn) {
      db.exec('BEGIN IMMEDIATE');
      try { const result = fn(); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    create(state) { db.prepare('INSERT INTO runs VALUES(?,?,?)').run(state.id, JSON.stringify(state), JSON.stringify(state)); },
    read(id) { const row = db.prepare('SELECT state FROM runs WHERE id=?').get(id); return row ? JSON.parse(row.state) : null; },
    initial(id) { const row = db.prepare('SELECT initial FROM runs WHERE id=?').get(id); return row ? JSON.parse(row.initial) : null; },
    save(state) { db.prepare('UPDATE runs SET state=? WHERE id=?').run(JSON.stringify(state), state.id); },
    list() { return db.prepare('SELECT id,state FROM runs ORDER BY rowid DESC').all().map(r => { const s = JSON.parse(r.state); return { id:r.id, title:s.title, status:s.status, tick:s.tick, participants:Object.keys(s.actors).length }; }); },
    receipt(runId, actorId, id) { return db.prepare('SELECT * FROM receipts WHERE run_id=? AND actor_id=? AND command_id=?').get(runId, actorId, id); },
    saveReceipt(runId, actorId, id, digest, result) { db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?)').run(runId, actorId, id, digest, JSON.stringify(result)); },
    event(runId, record) {
      const seq = db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS n FROM events WHERE run_id=?').get(runId).n;
      db.prepare('INSERT INTO events VALUES(?,?,?)').run(runId, seq, JSON.stringify({ ...record, seq }));
      return seq;
    },
    record(runId, kind, record) { db.prepare('INSERT INTO records(run_id,kind,record) VALUES(?,?,?)').run(runId, kind, JSON.stringify({at:new Date().toISOString(),...record})); },
    monitor(runId,afterRecord=0,afterEvent=0,actorId=null){
      const filter=actorId?" AND json_extract(record,'$.actorId')=?":"",values=actorId?[runId,actorId]:[runId];
      const records=afterRecord?db.prepare('SELECT id,kind,record FROM records WHERE run_id=?'+filter+' AND id>? ORDER BY id LIMIT 200').all(...values,afterRecord):db.prepare('SELECT id,kind,record FROM records WHERE run_id=?'+filter+' ORDER BY id DESC LIMIT 120').all(...values).reverse();
      const events=afterEvent?db.prepare('SELECT seq,record FROM events WHERE run_id=?'+filter+' AND seq>? ORDER BY seq LIMIT 200').all(...values,afterEvent):db.prepare('SELECT seq,record FROM events WHERE run_id=?'+filter+' ORDER BY seq DESC LIMIT 120').all(...values).reverse();
      const activity=db.prepare("SELECT json_extract(record,'$.actorId') AS actorId,MAX(json_extract(record,'$.at')) AS lastAt,MAX(json_extract(record,'$.engine')) AS engine FROM records WHERE run_id=? AND json_extract(record,'$.actorId') IS NOT NULL GROUP BY actorId").all(runId);
      const actions=db.prepare("SELECT json_extract(record,'$.actorId') AS actorId,COUNT(*) AS count FROM events WHERE run_id=? AND json_extract(record,'$.command') IS NOT NULL GROUP BY actorId").all(runId);
      return {activity,actions,participantIds:db.prepare('SELECT DISTINCT actor_id FROM sessions WHERE run_id=?').all(runId).map(r=>r.actor_id),records:records.map(r=>{const data=JSON.parse(r.record);if(r.kind==='model-request')delete data.body;if(r.kind==='model-response')delete data.raw;if(data.observation)delete data.observation.image;return {id:r.id,kind:r.kind,...data};}),events:events.map(r=>JSON.parse(r.record)),afterRecord:records.at(-1)?.id||afterRecord,afterEvent:events.at(-1)?.seq||afterEvent};
    },
    export(runId) {
      const row = db.prepare('SELECT initial,state FROM runs WHERE id=?').get(runId);
      if (!row) return null;
      return { version:1, initial:JSON.parse(row.initial), final:JSON.parse(row.state), events:db.prepare('SELECT record FROM events WHERE run_id=? ORDER BY seq').all(runId).map(r=>JSON.parse(r.record)), records:db.prepare('SELECT kind,record FROM records WHERE run_id=? ORDER BY id').all(runId).map(r=>({kind:r.kind,...JSON.parse(r.record)})) };
    },
    createSession(runId, actorId) {
      const token = secret(), joinCode = secret();
      db.prepare('INSERT INTO sessions(token,join_code,run_id,actor_id,expires) VALUES(?,?,?,?,?)').run(hash(token),hash(joinCode),runId,actorId,Date.now()+86400000);
      return { token, joinCode, actorId, runId };
    },
    revokeSessions(runId,actorId) { return db.prepare('UPDATE sessions SET expires=0,join_code=NULL WHERE run_id=? AND actor_id=?').run(runId,actorId).changes; },
    redeem(joinCode) {
      return store.transaction(() => {
        const row = db.prepare('SELECT * FROM sessions WHERE join_code=? AND expires>?').get(hash(joinCode), Date.now());
        if (!row) return null;
        const token = secret();
        db.prepare('UPDATE sessions SET token=?,join_code=NULL WHERE token=?').run(hash(token), row.token);
        return token;
      });
    },
    session(token) { return token ? db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token), Date.now()) : null; },
    seen(session, ids) {
      const seen = [...new Set([...JSON.parse(session.seen),...ids])].slice(-5000);
      db.prepare('UPDATE sessions SET seen=? WHERE token=?').run(JSON.stringify(seen),session.token);
      session.seen = JSON.stringify(seen);
    },
    close() { db.close(); }
  };
  return store;
}
