import { useEffect, useMemo, useState } from 'react';
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
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

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
    activeHeading: /アクティブな認定資格|有効な認定資格|Active certifications/i.test(normalized),
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
  const [open, setOpen] = useState(false);
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
    setOpen(true);
  }

  useEffect(() => {
    const handleOpen = () => {
      setMessage(null);
      setLoadError(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_TRANSCRIPT_IMPORT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_TRANSCRIPT_IMPORT_EVENT, handleOpen);
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
      const code = error instanceof TranscriptPdfReadException ? error.code : ('invalidPdf' as const);
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
    setMessage(parts.length > 0 ? `${parts.join('、')}しました。` : '保存できる資格はありませんでした。');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" type="button" onClick={openDialog}>
          資格を取り込む
        </Button>
        {savedCount > 0 ? (
          <span className="saved-count inline-flex min-w-5 items-center justify-center font-mono text-[11px] font-semibold text-muted">
            <span className="sr-only">保存済み </span>
            {savedCount}
            <span className="sr-only">件</span>
          </span>
        ) : null}
      </div>

      <DialogContent className="max-w-3xl p-0">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <DialogHeader>
            <p className="text-xs font-semibold text-primary">Microsoft Learn Transcript</p>
            <DialogTitle>資格情報を取り込む</DialogTitle>
            <DialogDescription>
              Microsoft Learn の Transcript を「印刷 → PDFとして保存」して選択します。PDF はこのブラウザ内だけで解析し、外部へアップロードしません。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="transcript-pdf">
              Transcript PDF
            </label>
            <Input
              id="transcript-pdf"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
            />
            <small className="text-xs leading-5 text-muted">最大 10 MB。テキストを含む PDF が対象です。</small>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" onClick={analyzePdf} disabled={!file || isLoading}>
              {isLoading ? '解析中…' : 'PDFを解析する'}
            </Button>
            <span className="text-xs text-muted">PDF ファイル自体は保存しません</span>
          </div>

          {loadError ? (
            <p className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm leading-6 text-danger" role="alert">
              {loadError}
            </p>
          ) : null}
        </div>

        {result ? (
          <section className="border-t border-border px-5 py-5 sm:px-6" aria-labelledby="import-results-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-muted">
                  Import candidates{pageCount ? ` · ${pageCount}ページ` : ''}
                </p>
                <h3 id="import-results-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">解析結果</h3>
              </div>
              <dl className="grid grid-cols-4 gap-x-5 border-y border-border py-2 text-right sm:border-0 sm:py-0">
                {[
                  ['資格', result.credentials.length],
                  ['照合済み', matchedCount],
                  ['未照合', unresolvedCount],
                  ['試験', result.exams.length],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold text-muted">{label}</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {result.credentials.length > 0 ? (
              <ul className="mt-5 divide-y divide-border border-y border-border">
                {result.credentials.map((candidate, index) => {
                  const key = candidateKey(candidate, index);
                  const mappedDefinitionId = resolutionMap[key] ?? '';
                  return (
                    <li className="py-4" key={key}>
                      <div className="candidate-title flex items-start justify-between gap-4">
                        <strong className="text-sm font-semibold leading-6 text-foreground">{candidate.detectedTitle}</strong>
                        <span className="shrink-0 text-xs text-muted">
                          {candidate.kind === 'certification' ? 'Certification' : 'Applied Skill'}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-muted">取得日</dt>
                          <dd className="mt-1 font-mono font-medium text-foreground">{candidate.earnedOn ?? '解析できませんでした'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-muted">有効期限</dt>
                          <dd className="mt-1 font-mono font-medium text-foreground">{candidate.expiresOn ?? '期限なし / 不明'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-muted">照合</dt>
                          <dd className="mt-1 font-medium text-foreground">
                            {candidate.matchStatus === 'matched' || mappedDefinitionId ? '照合済み' : '未照合'}
                          </dd>
                        </div>
                      </dl>

                      {candidate.matchStatus === 'unresolved' ? (
                        <label className="mt-4 grid gap-2 border-t border-border pt-4">
                          <span className="text-sm font-semibold text-foreground">この資格を手動で照合</span>
                          <NativeSelect
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
                          </NativeSelect>
                          <small className="text-xs leading-5 text-muted">
                            タイトルが似ているだけでは自動照合しません。内容を確認して選択してください。
                          </small>
                        </label>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {result.exams.length > 0 ? (
              <details className="mt-5 border-b border-border pb-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">検出した試験履歴 {result.exams.length}件</summary>
                <ul className="mt-3 grid gap-2">
                  {result.exams.map((exam) => (
                    <li className="grid grid-cols-[70px_minmax(0,1fr)] gap-2 text-xs sm:grid-cols-[70px_minmax(0,1fr)_auto]" key={`${exam.examNumber}-${exam.passedOn ?? ''}`}>
                      <strong className="font-mono text-foreground">{exam.examNumber}</strong>
                      <span className="text-muted">{exam.title}</span>
                      <time className="col-start-2 font-mono text-muted sm:col-start-auto">{exam.passedOn ?? '日付不明'}</time>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {result.credentials.length === 0 && result.exams.length === 0 && diagnostics ? (
              <details className="mt-5 rounded-lg border border-border bg-surface-muted p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-foreground">診断情報（個人データは表示しません）</summary>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div><dt className="text-muted">抽出テキスト</dt><dd className="font-mono text-foreground">{diagnostics.textChars}文字</dd></div>
                  <div><dt className="text-muted">Microsoft</dt><dd className="font-mono text-foreground">{diagnostics.microsoftCount}件</dd></div>
                  <div><dt className="text-muted">試験コード</dt><dd className="font-mono text-foreground">{diagnostics.examCodeCount}件</dd></div>
                  <div><dt className="text-muted">日本語日付</dt><dd className="font-mono text-foreground">{diagnostics.japaneseDateCount}件</dd></div>
                  <div><dt className="text-muted">資格見出し</dt><dd className="text-foreground">{diagnostics.activeHeading ? 'あり' : 'なし'}</dd></div>
                  <div><dt className="text-muted">試験見出し</dt><dd className="text-foreground">{diagnostics.examHeading ? 'あり' : 'なし'}</dd></div>
                </dl>
              </details>
            ) : null}

            {result.warnings.length > 0 ? (
              <ul className="mt-4 grid gap-1 text-xs leading-5 text-warning" aria-label="解析時の注意">
                {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm font-semibold text-foreground">{matchedCount}件を保存・再確認できます</strong>
                <span className="mt-1 block text-xs leading-5 text-muted">未照合の資格と試験履歴は、この段階では保存しません。</span>
              </div>
              <Button className="sm:shrink-0" type="button" onClick={confirmImport} disabled={matchedCount === 0}>
                確認して保存
              </Button>
            </div>

            {message ? (
              <p className="mt-4 rounded-md border border-success/20 bg-success-soft px-3 py-2 text-sm font-medium text-success" role="status">
                {message}
              </p>
            ) : null}
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
