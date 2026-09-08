import { useRef, useState } from 'react';
import {
  parseMicrosoftLearnTranscript,
  type TranscriptParseResult,
} from '../domain/transcript-import.ts';
import { normalizeMicrosoftLearnTranscriptShareUrl } from '../domain/transcript-share-url.ts';
import {
  loadStoredCredentials,
  saveConfirmedCredentialCandidates,
} from '../storage/local-credential-store.ts';
import { fetchTranscriptThroughApi } from '../transport/transcript-api.ts';
import '../import.css';

const transcriptApiUrl = import.meta.env.VITE_TRANSCRIPT_API_URL;

function transcriptHtmlToText(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  for (const node of document.querySelectorAll('script, style, noscript')) node.remove();
  return document.body?.textContent ?? '';
}

export function TranscriptImport() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [result, setResult] = useState<TranscriptParseResult | null>(null);
  const [savedCount, setSavedCount] = useState(() => loadStoredCredentials().length);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const matchedCount =
    result?.credentials.filter(
      (candidate) => candidate.matchStatus === 'matched' && candidate.earnedOn,
    ).length ?? 0;
  const unresolvedCount = result?.credentials.filter((candidate) => candidate.matchStatus === 'unresolved').length ?? 0;

  function openDialog() {
    setMessage(null);
    setLoadError(null);
    dialogRef.current?.showModal();
  }

  async function loadFromShareUrl() {
    setMessage(null);
    setLoadError(null);
    setResult(null);

    const normalized = normalizeMicrosoftLearnTranscriptShareUrl(shareUrl);
    if (!normalized.ok) {
      setLoadError('Microsoft Learn の Transcript 共有URLを入力してください。');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchTranscriptThroughApi(transcriptApiUrl, normalized.url);
      if (!response.ok) {
        if (response.error === 'notConfigured' || response.error === 'invalidEndpoint') {
          setLoadError('Transcript 取得サービスが設定されていません。');
        } else if (response.status) {
          setLoadError(`Microsoft Learn から取得できませんでした（HTTP ${response.status}）。`);
        } else {
          setLoadError('Transcript 取得サービスへ接続できませんでした。時間をおいて再度お試しください。');
        }
        return;
      }

      const transcriptText = transcriptHtmlToText(response.html);
      const parsed = parseMicrosoftLearnTranscript(transcriptText);
      setResult(parsed);
    } catch {
      setLoadError('Transcript 取得サービスで予期しないエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }

  function confirmImport() {
    if (!result) return;
    const saved = saveConfirmedCredentialCandidates(result.credentials, 'learnTranscriptShareUrl');
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
          Microsoft Learn の Transcript 共有URLを貼り付けます。取得した内容は確認するまで保存されません。
        </p>

        <label className="transcript-field">
          <span>Transcript 共有URL</span>
          <input
            type="url"
            value={shareUrl}
            onChange={(event) => setShareUrl(event.currentTarget.value)}
            placeholder="https://learn.microsoft.com/.../users/.../transcript/..."
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="import-actions">
          <button
            className="primary-action"
            type="button"
            onClick={loadFromShareUrl}
            disabled={!shareUrl.trim() || isLoading}
          >
            {isLoading ? '取得中…' : '共有URLから読み込む'}
          </button>
          <span>共有URL自体は保存しません</span>
        </div>

        {loadError ? <p className="load-error" role="alert">{loadError}</p> : null}

        {result ? (
          <section className="import-results" aria-labelledby="import-results-title">
            <div className="import-result-summary">
              <div>
                <p className="context-label">Import candidates</p>
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
                  <li key={`${candidate.kind}-${candidate.externalNumber ?? candidate.detectedTitle}-${candidate.earnedOn ?? ''}`}>
                    <div className="candidate-title">
                      <strong>{candidate.detectedTitle}</strong>
                      <span>{candidate.kind === 'certification' ? 'Certification' : 'Applied Skill'}</span>
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
              <button className="primary-action" type="button" onClick={confirmImport} disabled={matchedCount === 0}>
                確認して保存
              </button>
            </div>

            {message ? <p className="save-message" role="status">{message}</p> : null}
          </section>
        ) : null}
      </dialog>
    </>
  );
}
