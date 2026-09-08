import { useEffect, useMemo, useRef, useState } from 'react';
import { credentialDefinitions } from '../domain/credential-catalog.ts';
import {
  parseMicrosoftLearnTranscript,
  type TranscriptCredentialCandidate,
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

export const OPEN_TRANSCRIPT_IMPORT_EVENT = 'ms-credentials-tracker:open-transcript-import';

interface TranscriptDiagnostics {
  textChars: number;
  microsoftCount: number;
  examCodeCount: number;
  japaneseDateCount: number;
  activeHeading: boolean;
  examHeading: boolean;
}

function buildDiagnostics(text: string): TranscriptDiagnostics {
  const normalized = text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[‐‑‒–—−]/g, '-');
  return {
    textChars: normalized.length,
    microsoftCount: (normalized.match(/Microsoft/gi) ?? []).length,
    examCodeCount: (normalized.match(/[A-Z]{1,5}-\d{2,4}/g) ?? []).length,
    japaneseDateCount: (
      normalized.match(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/g) ?? []
    ).length,
    activeHeading: /アクティブな認定資格|有効な認定資格|Active certifications/i.test(
      normalized,
    ),
    examHeading: /合格した試験|合格済みの試験|Passed exams/i.test(normalized),
  };
}

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

function candidateKey(candidate: TranscriptCredentialCandidate, index: number): string {
  return [
    candidate.kind,
    candidate.externalNumber ?? candidate.detectedTitle,
    candidate.earnedOn ?? '',
    String(index),
  ].join(':');
}

export function TranscriptImport() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptParseResult | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(
    () => loadStoredCredentials().filter((credential) => !credential.archivedAt).length,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<TranscriptDiagnostics | null>(null);
  const [resolutionMap, setResolutionMap] = useState<Record<string, string>>({});

  const effectiveCandidates = useMemo(
    () =>
      result?.credentials.map((candidate, index) => {
        const definitionId = resolutionMap[candidateKey(candidate, index)];
        if (!definitionId || candidate.matchStatus === 'matched') return candidate;
        return {
          ...candidate,
          matchedDefinitionId: definitionId,
          matchStatus: 'matched' as const,
        };
      }) ?? [],
    [result, resolutionMap],
  );
  const matchedCount = effectiveCandidates.filter(
    (candidate) => candidate.matchStatus === 'matched' && candidate.earnedOn,
  ).length;
  const unresolvedCount = effectiveCandidates.filter(
    (candidate) => candidate.matchStatus === 'unresolved',
  ).length;

  function openDialog() {
    setMessage(null);
    setLoadError(null);
    dialogRef.current?.showModal();
  }

  useEffect(() => {
    const open = () => openDialog();
    window.addEventListener(OPEN_TRANSCRIPT_IMPORT_EVENT, open);
    return () => window.removeEventListener(OPEN_TRANSCRIPT_IMPORT_EVENT, open);
  }, []);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setPageCount(null);
    setMessage(null);
    setLoadError(null);
    setDiagnostics(null);
    setResolutionMap({});
  }

  async function analyzePdf() {
    if (!file) return;
    setMessage(null);
    setLoadError(null);
    setResult(null);
    setPageCount(null);
    setDiagnostics(null);
    setResolutionMap({});
    setIsLoading(true);

    try {
      const extracted = await extractTranscriptPdfText(file);
      setPageCount(extracted.pageCount);
      setDiagnostics(buildDiagnostics(extracted.text));
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
    const saved = saveConfirmedCredentialCandidates(effectiveCandidates, 'learnTranscriptPdf');
    setSavedCount(saved.credentials.filter((credential) => !credential.archivedAt).length);

    const parts: string[] = [];
    if (saved.addedCount > 0) parts.push(`${saved.addedCount}件を追加`);
    if (saved.updatedCount > 0) parts.push(`${saved.updatedCount}件を更新`);
    if (saved.unchangedCount > 0) parts.push(`${saved.unchangedCount}件を再確認`);
    if (saved.conflictCount > 0) parts.push(`${saved.conflictCount}件は手動修正と競合`);
    setMessage(
      parts.length > 0
        ? `${parts.join('、')}しました。`
        : '保存できる資格はありませんでした。',
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
                {result.credentials.map((candidate, index) => {
                  const key = candidateKey(candidate, index);
                  const mappedDefinitionId = resolutionMap[key] ?? '';
                  return (
                    <li key={key}>
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
                          <dd>{candidate.matchStatus === 'matched' || mappedDefinitionId ? '照合済み' : '未照合'}</dd>
                        </div>
                      </dl>
                      {candidate.matchStatus === 'unresolved' ? (
                        <label className="candidate-resolution">
                          <span>この資格を手動で照合</span>
                          <select
                            value={mappedDefinitionId}
                            onChange={(event) =>
                              setResolutionMap((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                          >
                            <option value="">未照合のままにする</option>
                            {credentialDefinitions
                              .filter((definition) => definition.kind === candidate.kind)
                              .map((definition) => (
                                <option value={definition.id} key={definition.id}>
                                  {definition.displayCode ? `${definition.displayCode} · ` : ''}{definition.canonicalTitle}
                                </option>
                              ))}
                          </select>
                          <small>タイトルが似ているだけでは自動照合しません。内容を確認して選択してください。</small>
                        </label>
                      ) : null}
                    </li>
                  );
                })}
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

            {result.credentials.length === 0 && result.exams.length === 0 && diagnostics ? (
              <details className="import-diagnostics" open>
                <summary>診断情報（個人データは表示しません）</summary>
                <dl>
                  <div>
                    <dt>抽出テキスト</dt>
                    <dd>{diagnostics.textChars}文字</dd>
                  </div>
                  <div>
                    <dt>Microsoft</dt>
                    <dd>{diagnostics.microsoftCount}件</dd>
                  </div>
                  <div>
                    <dt>試験コード</dt>
                    <dd>{diagnostics.examCodeCount}件</dd>
                  </div>
                  <div>
                    <dt>日本語日付</dt>
                    <dd>{diagnostics.japaneseDateCount}件</dd>
                  </div>
                  <div>
                    <dt>資格見出し</dt>
                    <dd>{diagnostics.activeHeading ? 'あり' : 'なし'}</dd>
                  </div>
                  <div>
                    <dt>試験見出し</dt>
                    <dd>{diagnostics.examHeading ? 'あり' : 'なし'}</dd>
                  </div>
                </dl>
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
                <strong>{matchedCount}件を保存・再確認できます</strong>
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
