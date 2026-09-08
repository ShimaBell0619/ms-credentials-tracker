import { useRef, useState } from 'react';
import {
  parseMicrosoftLearnTranscript,
  type TranscriptParseResult,
} from '../domain/transcript-import.ts';
import {
  loadStoredCredentials,
  saveConfirmedCredentialCandidates,
} from '../storage/local-credential-store.ts';
import {
  extractTranscriptPdfText,
  TranscriptPdfReadException,
  type TranscriptPdfReadError,
} from '../transport/transcript-pdf.ts';
import '../import.css';

function pdfErrorMessage(error: TranscriptPdfReadError): string {
  switch (error) {
    case 'notPdf':
      return 'Microsoft Learn から保存した PDF ファイルを選択してください。';
    case 'tooLarge':
      return 'PDF は 10 MB 以下にしてください。';
    case 'passwordProtected':
      return 'パスワードで保護された PDF は読み込めません。';
    case 'tooManyPages':
      return 'PDF のページ数が多すぎます。Microsoft Learn の Transcript PDF を選択してください。';
    case 'noText':
      return 'PDF からテキストを抽出できませんでした。画像化された PDF は現在対象外です。';
    case 'textTooLarge':
      return 'PDF 内のテキスト量が多すぎます。Microsoft Learn の Transcript PDF を選択してください。';
    default:
      return 'PDF を読み込めませんでした。Microsoft Learn の Transcript から保存した PDF か確認してください。';
  }
}

export function TranscriptImport() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptParseResult | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(() => loadStoredCredentials().length);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const matchedCount =
    result?.credentials.filter(
      (candidate) => candidate.matchStatus === 'matched' && candidate.earnedOn,
    ).length ?? 0;
  const unresolvedCount =
    result?.credentials.filter((candidate) => candidate.matchStatus === 'unresolved').length ?? 0;

  function openDialog() {
    setMessage(null);
    setLoadError(null);
    dialogRef.current?.showModal();
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setPageCount(null);
    setMessage(null);
    setLoadError(null);
  }

  async function analyzePdf() {
    if (!file) return;
    setMessage(null);
    setLoadError(null);
    setResult(null);
    setPageCount(null);
    setIsLoading(true);

    try {
      const extracted = await extractTranscriptPdfText(file);
      setPageCount(extracted.pageCount);
      setResult(parseMicrosoftLearnTranscript(extracted.text));
    } catch (error) {
      const code =
        error instanceof TranscriptPdfReadException ? error.code : ('invalidPdf' as const);
      setLoadError(pdfErrorMessage(code));
    } finally {
      setIsLoading(false);
    }
  }

  function confirmImport() {
    if (!result) return;
    const saved = saveConfirmedCredentialCandidates(result.credentials, 'learnTranscriptPdf');
    setSavedCount(saved.credentials.length);
    setMessage(
      saved.addedCount > 0
        ? `${saved.addedCount}件をブラウザに保存しました。`
        : '新しく保存できる資格はありませんでした。',
    );
  }

  return (
    <>
      <button className="import-trigger" type="button" onClick={openDialog}>
        資格を取り込む
      </button>
      {savedCount > 0 ? (
        <span className="saved-count">
          <span className="sr-only">保存済み </span>
          {savedCount}
          <span className="sr-only">件</span>
        </span>
      ) : null}

      <dialog ref={dialogRef} className="import-dialog" aria-labelledby="import-dialog-title">
        <div className="import-dialog-header">
          <div>
            <p className="context-label">Microsoft Learn Transcript</p>
            <h2 id="import-dialog-title">資格情報を取り込む</h2>
          </div>
          <form method="dialog">
            <button className="dialog-close" type="submit" aria-label="閉じる">
              ×
            </button>
          </form>
        </div>

        <p className="import-description">
          Microsoft Learn の Transcript を「印刷 → PDFとして保存」して選択します。PDF はこのブラウザ内だけで解析し、外部へアップロードしません。
        </p>

        <label className="transcript-field">
          <span>Transcript PDF</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
          />
          <small>最大 10 MB。テキストを含む PDF が対象です。</small>
        </label>

        <div className="import-actions">
          <button
            className="primary-action"
            type="button"
            onClick={analyzePdf}
            disabled={!file || isLoading}
          >
            {isLoading ? '解析中…' : 'PDFを解析する'}
          </button>
          <span>PDF ファイル自体は保存しません</span>
        </div>

        {loadError ? (
          <p className="load-error" role="alert">
            {loadError}
          </p>
        ) : null}

        {result ? (
          <section className="import-results" aria-labelledby="import-results-title">
            <div className="import-result-summary">
              <div>
                <p className="context-label">
                  Import candidates{pageCount ? ` · ${pageCount}ページ` : ''}
                </p>
                <h3 id="import-results-title">解析結果</h3>
              </div>
              <dl>
                <div>
                  <dt>資格</dt>
                  <dd>{result.credentials.length}</dd>
                </div>
                <div>
                  <dt>照合済み</dt>
                  <dd>{matchedCount}</dd>
                </div>
                <div>
                  <dt>未照合</dt>
                  <dd>{unresolvedCount}</dd>
                </div>
                <div>
                  <dt>試験</dt>
                  <dd>{result.exams.length}</dd>
                </div>
              </dl>
            </div>

            {result.credentials.length > 0 ? (
              <ul className="candidate-list">
                {result.credentials.map((candidate) => (
                  <li
                    key={`${candidate.kind}-${candidate.externalNumber ?? candidate.detectedTitle}-${candidate.earnedOn ?? ''}`}
                  >
                    <div className="candidate-title">
                      <strong>{candidate.detectedTitle}</strong>
                      <span>
                        {candidate.kind === 'certification' ? 'Certification' : 'Applied Skill'}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>取得日</dt>
                        <dd>{candidate.earnedOn ?? '解析できませんでした'}</dd>
                      </div>
                      <div>
                        <dt>有効期限</dt>
                        <dd>{candidate.expiresOn ?? '期限なし / 不明'}</dd>
                      </div>
                      <div>
                        <dt>照合</dt>
                        <dd>{candidate.matchStatus === 'matched' ? '照合済み' : '未照合'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : null}

            {result.exams.length > 0 ? (
              <details className="exam-results">
                <summary>検出した試験履歴 {result.exams.length}件</summary>
                <ul>
                  {result.exams.map((exam) => (
                    <li key={`${exam.examNumber}-${exam.passedOn ?? ''}`}>
                      <strong>{exam.examNumber}</strong>
                      <span>{exam.title}</span>
                      <time>{exam.passedOn ?? '日付不明'}</time>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {result.warnings.length > 0 ? (
              <ul className="import-warnings" aria-label="解析時の注意">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <div className="confirm-area">
              <div>
                <strong>{matchedCount}件を保存できます</strong>
                <span>未照合の資格と試験履歴は、この段階では保存しません。</span>
              </div>
              <button
                className="primary-action"
                type="button"
                onClick={confirmImport}
                disabled={matchedCount === 0}
              >
                確認して保存
              </button>
            </div>

            {message ? (
              <p className="save-message" role="status">
                {message}
              </p>
            ) : null}
          </section>
        ) : null}
      </dialog>
    </>
  );
}
