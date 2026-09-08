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
  assert.equal(diagnostic.scriptCount, 0);
  assert.equal(diagnostic.iframeCount, 0);
  assert.match(describeTranscriptDiagnostic(diagnostic), /ローカライズ/);
});

test('distinguishes a client-rendered shell from localized transcript text', () => {
  const html = `<!doctype html>
    <html lang="ja-jp">
      <body>
        <div id="root"></div>
        <script src="/assets/profile-runtime.js"></script>
        <script>window.fetch('/api/profile');</script>
      </body>
    </html>`;

  const diagnostic = analyzeTranscriptHtml(html);
  assert.equal(diagnostic.containsMicrosoftCertified, false);
  assert.equal(diagnostic.containsJapaneseDate, false);
  assert.equal(diagnostic.scriptCount, 2);
  assert.equal(diagnostic.externalScriptCount, 1);
  assert.equal(diagnostic.inlineScriptCount, 1);
  assert.equal(diagnostic.containsApiHint, true);
  assert.equal(diagnostic.bodyTextLength, 0);
  assert.match(describeTranscriptDiagnostic(diagnostic), /JavaScript実行後/);
});

test('detects iframe and error-page structures without returning page content', () => {
  const iframeHtml = '<html><body><iframe src="/profile/transcript-frame"></iframe></body></html>';
  const iframeDiagnostic = analyzeTranscriptHtml(iframeHtml);
  assert.equal(iframeDiagnostic.iframeCount, 1);
  assert.equal(iframeDiagnostic.containsIframeTranscriptHint, true);
  assert.match(describeTranscriptDiagnostic(iframeDiagnostic), /別フレーム/);

  const errorHtml = '<html lang="en-us"><body><h1>404 - Page not found</h1></body></html>';
  const errorDiagnostic = analyzeTranscriptHtml(errorHtml);
  assert.equal(errorDiagnostic.containsNotFoundOrDeniedMarker, true);
  assert.match(describeTranscriptDiagnostic(errorDiagnostic), /エラー/);
});
