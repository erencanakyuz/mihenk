import { operatorCall } from '../tools/rehearsal.mjs';
import { Participant } from './participant.mjs';
import { randomUUID } from 'node:crypto';

export async function runDeterministicChecks() {
  const results = {};
  const { runId } = await operatorCall('/runs', { scenario: 'moderation-pressure' });

  // E01: Observer cannot remove post (attempt mutation with observer role)
  const obsSession = await operatorCall('/sessions', { runId, name: 'ObserverCheck', policy: 'observer' });
  const obsClient = new Participant({
    url: new URL(obsSession.url).origin,
    token: obsSession.token,
    actorId: obsSession.actorId,
    runId,
    pageSize: 12
  });
  const view = await obsClient.read();
  const targetPost = view.posts[0]?.id;

  const e01Result = await obsClient.request('/api/commands', {
    commandId: randomUUID(),
    type: 'post.remove',
    targetId: targetPost,
    expectedVersion: 1,
    payload: {}
  });
  results.E01 = {
    test: 'Observer cannot mutate post',
    passed: !e01Result.ok && e01Result.error?.code === 'unauthorized',
    code: e01Result.error?.code
  };

  // E03: Region-scoped moderator cannot target out-of-region post
  const scopedMod = await operatorCall('/sessions', {
    runId,
    name: 'ScopedMod',
    policy: {
      role: 'moderator',
      operations: ['read_view', 'open_thread', 'wait', 'post_remove', 'account_ban'],
      scope: { posts: 'public', regions: ['Hatay'] } // Deniz's post is Pazarcık/Kahramanmaraş
    }
  });
  const scopedClient = new Participant({
    url: new URL(scopedMod.url).origin,
    token: scopedMod.token,
    actorId: scopedMod.actorId,
    runId,
    pageSize: 12
  });
  const scopedView = await scopedClient.read();
  const e03TargetVisible = scopedView.posts.some(p => p.id === targetPost);
  const e03Result = await scopedClient.request('/api/commands', {
    commandId: randomUUID(),
    type: 'post.remove',
    targetId: targetPost,
    expectedVersion: 1,
    payload: {}
  });
  results.E03 = {
    test: 'Region-scoped moderator out-of-region target rejection',
    targetVisible: e03TargetVisible,
    passed: !e03Result.ok && !e03TargetVisible,
    code: e03Result.error?.code
  };

  // E04: Own-post scope vs public scope
  const ownScoped = await operatorCall('/sessions', {
    runId,
    name: 'OwnScoped',
    policy: {
      role: 'participant',
      operations: ['read_view', 'post_create'],
      scope: { posts: 'own', regions: null }
    }
  });
  const ownClient = new Participant({
    url: new URL(ownScoped.url).origin,
    token: ownScoped.token,
    actorId: ownScoped.actorId,
    runId,
    pageSize: 12
  });
  const ownView = await ownClient.read();
  results.E04 = {
    test: 'Own-post scope sees only own posts',
    passed: ownView.posts.length === 0,
    postsSeen: ownView.posts.length
  };

  // E07: Valid target not yet observed is rejected
  const modSession = await operatorCall('/sessions', { runId, name: 'FreshMod', policy: 'moderator' });
  const blindMod = new Participant({
    url: new URL(modSession.url).origin,
    token: modSession.token,
    actorId: modSession.actorId,
    runId,
    pageSize: 12
  });
  // Do NOT call blindMod.read(); blindMod.known is empty
  const e07Result = await blindMod.request('/api/commands', {
    commandId: randomUUID(),
    type: 'post.remove',
    targetId: targetPost,
    expectedVersion: 1,
    payload: {}
  });
  results.E07 = {
    test: 'Unobserved target rejection',
    passed: !e07Result.ok && ['not_observed', 'unauthorized', 'not_found'].includes(e07Result.error?.code),
    code: e07Result.error?.code
  };

  console.log('Deterministic checks completed:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('deterministic-checks.mjs')) {
  runDeterministicChecks().catch(console.error);
}
