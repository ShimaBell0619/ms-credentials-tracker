import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeTranscriptHtml,
  describeTranscriptDiagnostic,
} from '../src/domain/transcript-html-diagnostics.ts';

test('detects localized transcript markers without exposing transcript content', () => {
  const html = `<!doctype html>
    <html lang="ja-jp">
      <body>
        <h1>Microsoft Certified: Azure Administrator Associate</h1>
        <p>2026 年 9 月 8 日</p>
      </body>
    </html>`;

  const diagnostic = analyzeTranscriptHtml(html);
  assert.equal(diagnostic.documentLang, 'ja-jp');
  assert.equal(diagnostic.containsMicrosoftCertified, true);
  assert.equal(diagnostic.containsJapaneseDate, true);
  assert.equal(diagnostic.containsPassedExams, false);
  assert.match(describeTranscriptDiagnostic(diagnostic), /ローカライズ/);
});

test('distinguishes a client-rendered shell from localized transcript text', () => {
  const html = `<!doctype html>
    <html lang="ja-jp">
      <body><div id="root"></div><script type="application/json">{}</script></body>
    </html>`;

  const diagnostic = analyzeTranscriptHtml(html);
  assert.equal(diagnostic.containsMicrosoftCertified, false);
  assert.equal(diagnostic.containsJapaneseDate, false);
  assert.equal(diagnostic.containsHydrationData, true);
  assert.match(describeTranscriptDiagnostic(diagnostic), /後から描画/);
});
