import path from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { run } from './runner.mjs';
import { ADVERSARIAL_CONFIG, evaluateAdversarialCohort } from './adversarial-crisis-20.mjs';
import { operatorConfig, operatorCall } from '../tools/rehearsal.mjs';

const root = path.resolve(import.meta.dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const options = Object.fromEntries(
    args.map(arg => {
      const [key, val] = arg.replace(/^--/, '').split('=');
      return [key, val === undefined ? true : val];
    })
  );

  console.log('================================================================');
  console.log('   MİHENK 20-Ajanlı Çekişmeli Kriz ve Dezenformasyon Tatbikatı  ');
  console.log('================================================================\n');

  const engine = options.engine || (options.endpoint ? 'model' : 'model');
  const endpoint = options.endpoint || 'http://127.0.0.1:8000/v1';
  const decisions = Number.parseInt(options.decisions, 10) || 25;
  const maxTokens = Number.parseInt(options.tokens, 10) || 5000000;
  const concurrency = Number.parseInt(options.concurrency, 10) || 10;

  console.log(`* Senaryo: ${ADVERSARIAL_CONFIG.scenario}`);
  console.log(`* Katılımcı Sayısı: ${ADVERSARIAL_CONFIG.participants} (4 Moderatör, 3 Troll, 5 Afetzede, 5 STK, 3 Vatandaş)`);
  console.log(`* Motor: ${engine}`);
  console.log(`* Eşzamanlılık: ${concurrency}`);
  console.log(`* Katılımcı Başına Karar Sınırı: ${decisions}`);
  console.log(`* Toplam Token Bütçesi: ${maxTokens.toLocaleString('tr-TR')} token\n`);

  const runConfig = {
    ...ADVERSARIAL_CONFIG,
    engine,
    inferenceConcurrency: concurrency,
    maxDecisionsPerParticipant: decisions,
    maxTotalTokens: maxTokens,
    endpoints: engine === 'model' ? [{
      url: endpoint,
      model: options.model || 'Qwen/Qwen3.5-9B',
      temperature: 0.1,
      maxContextTokens: 16384,
      requestTimeoutSeconds: 60
    }] : []
  };

  const op = operatorConfig();
  console.log('>>> [1/3] Senaryo ve Dünya Başlatılıyor...');
  const { runId } = await operatorCall('/runs', { scenario: runConfig.scenario }, op);
  runConfig.runId = runId;
  console.log(`>>> Oluşturulan Run ID: ${runId}`);

  console.log('>>> [2/3] 20 Ajanlık Simülasyon Çalıştırılıyor...');
  const cohortState = await run(runConfig);
  console.log('\n>>> Simülasyon Tamamlandı!');
  console.log(`* Durdurma Sebebi: ${cohortState.stopReason}`);
  console.log(`* Harcanan Token: ${cohortState.spentTokens}`);
  console.log(`* Toplam Tur: ${cohortState.round}`);

  console.log('\n>>> [3/3] Hakikat Referanslı (Ground-Truth Oracle) Değerlendirme Yapılıyor...');
  const runExport = await operatorCall('/export?runId=' + runId, undefined, op);
  const evaluation = evaluateAdversarialCohort(runExport);

  console.log('\n================================================================');
  console.log(`   DEĞERLENDİRME PUANI: ${evaluation.totalScore} / ${evaluation.maxScore}  |  NOT: ${evaluation.grade}`);
  console.log(`   DURUM: ${evaluation.passed ? '✅ BAŞARILI (PASS)' : '❌ BAŞARISIZ (FAIL)'}`);
  console.log('================================================================\n');

  console.log('--- Dezenformasyon ve Troll Savunması (Puan: ' + evaluation.checks.disinformationDefense.score + '/' + evaluation.checks.disinformationDefense.maxScore + ') ---');
  for (const d of evaluation.checks.disinformationDefense.details) console.log('  ' + d);

  console.log('\n--- Masumiyet ve False-Positive Güvenliği (Puan: ' + evaluation.checks.falsePositiveSafety.score + '/' + evaluation.checks.falsePositiveSafety.maxScore + ') ---');
  if (evaluation.checks.falsePositiveSafety.violations.length === 0) {
    console.log('  PASS: Hiçbir masum afetzede veya yetkili kurum yanlışlıkla banlanmadı.');
  } else {
    for (const v of evaluation.checks.falsePositiveSafety.violations) console.log('  ' + v);
  }

  console.log('\n--- Yardım Koordinasyon Verimi (Puan: ' + evaluation.checks.aidCoordination.score + '/' + evaluation.checks.aidCoordination.maxScore + ') ---');
  for (const d of evaluation.checks.aidCoordination.details) console.log('  ' + d);

  console.log('\n--- Vatandaş Dezenformasyon Direnci (Puan: ' + evaluation.checks.civilianResilience.score + '/' + evaluation.checks.civilianResilience.maxScore + ') ---');
  for (const d of evaluation.checks.civilianResilience.details) console.log('  ' + d);

  // Raporu diske kaydet
  const reportPath = path.join(root, 'docs/experiments', `adversarial-crisis-${runId}.md`);
  const reportMarkdown = `# 20-Ajanlı Çekişmeli Kriz ve Dezenformasyon Tatbikatı Raporu

* **Run ID:** \`${runId}\`
* **Tarih:** ${new Date().toISOString()}
* **Puan:** **${evaluation.totalScore} / ${evaluation.maxScore}**
* **Not:** **${evaluation.grade}**
* **Sonuç:** ${evaluation.passed ? '✅ BAŞARILI (PASS)' : '❌ BAŞARISIZ (FAIL)'}
* **Harcanan Token:** ${cohortState.spentTokens.toLocaleString('tr-TR')}
* **Durdurma Sebebi:** \`${cohortState.stopReason}\`

## 1. Dezenformasyon Savunması (${evaluation.checks.disinformationDefense.score} / ${evaluation.checks.disinformationDefense.maxScore})
${evaluation.checks.disinformationDefense.details.map(d => `- ${d}`).join('\n')}

## 2. Masumiyet Güvenliği (${evaluation.checks.falsePositiveSafety.score} / ${evaluation.checks.falsePositiveSafety.maxScore})
${evaluation.checks.falsePositiveSafety.violations.length ? evaluation.checks.falsePositiveSafety.violations.map(v => `- ${v}`).join('\n') : '- ✅ Hiçbir masum afetzede veya kurum zarar görmedi.'}

## 3. Yardım Koordinasyonu (${evaluation.checks.aidCoordination.score} / ${evaluation.checks.aidCoordination.maxScore})
${evaluation.checks.aidCoordination.details.map(d => `- ${d}`).join('\n')}

## 4. Vatandaş Direnci (${evaluation.checks.civilianResilience.score} / ${evaluation.checks.civilianResilience.maxScore})
${evaluation.checks.civilianResilience.details.map(d => `- ${d}`).join('\n')}
`;

  writeFileSync(reportPath, reportMarkdown, 'utf8');
  console.log(`\n📄 Ayrıntılı rapor kaydedildi: ${reportPath}`);
}

main().catch(err => {
  console.error('\n❌ Tatbikat hatası:', err);
  process.exitCode = 1;
});
