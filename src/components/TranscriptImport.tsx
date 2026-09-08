import { useRef, useState } from 'react';
import {
  parseMicrosoftLearnTranscript,
  type TranscriptParseResult,
} from '../domain/transcript-import.ts';
import {
  loadStoredCredentials,
  saveConfirmedCredentialCandidates,
} from '../storage/local-credential-store.ts';
import '../import.css';

export function TranscriptImport() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<TranscriptParseResult | null>(null);
  const [savedCount, setSavedCount] = useState(() => loadStoredCredentials().length);
  const [message, setMessage] = useState<string | null>(null);

  const matchedCount =
    result?.credentials.filter(
      (candidate) => candidate.matchStatus === 'matched' && candidate.earnedOn,
    ).length ?? 0;
  const unresolvedCount = result?.credentials.filter((candidate) => candidate.matchStatus === 'unresolved').length ?? 0;

  function openDialog() {
    setMessage(null);
    dialogRef.current?.showModal();
  }

  function parseTranscript() {
    setMessage(null);
    setResult(parseMicrosoftLearnTranscript(text));
  }

  function confirmImport() {
    if (!result) return;
    const saved = saveConfirmedCredentialCandidates(result.credentials);
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
          Microsoft Learn の Transcript をコピーして貼り付けます。解析結果は確認するまで保存されません。
        </p>

        <label className="transcript-field">
          <span>Transcript テキスト</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder="Transcript の内容をここに貼り付け"
            rows={8}
          />
        </label>

        <div className="import-actions">
          <button className="primary-action" type="button" onClick={parseTranscript} disabled={!text.trim()}>
            解析する
          </button>
          <span>この操作だけでは保存されません</span>
        </div>

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
