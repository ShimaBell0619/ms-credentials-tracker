import { useEffect, useMemo, useState } from 'react';
import { CredentialRegister } from './components/CredentialRegister';
import { DataAndIntegrations } from './components/DataAndIntegrations';
import { PrimaryCredentialState } from './components/PrimaryCredentialState';
import { RenewalTimeline } from './components/RenewalTimeline';
import {
  OPEN_TRANSCRIPT_IMPORT_EVENT,
  TranscriptImport,
} from './components/TranscriptImport';
import { Button } from './components/ui/button';
import { buildTranscriptRefreshState } from './domain/credential-freshness';
import {
  addDaysIso,
  buildCredentialDashboard,
  localDateToIso,
} from './domain/credential-projection';
import { formatFullDate, formatReferenceDate } from './presentation/credential-view';
import {
  CREDENTIAL_STORAGE_CHANGED_EVENT,
  loadStoredCredentials,
} from './storage/local-credential-store';

export default function App() {
  const [storedCredentials, setStoredCredentials] = useState(() => loadStoredCredentials());
  const referenceDate = localDateToIso(new Date());
  const timelineEnd = addDaysIso(referenceDate, 89);
  const dashboard = useMemo(
    () => buildCredentialDashboard(storedCredentials, referenceDate),
    [storedCredentials, referenceDate],
  );
  const refreshState = useMemo(
    () => buildTranscriptRefreshState(storedCredentials, referenceDate),
    [storedCredentials, referenceDate],
  );
  const hasCredentials = dashboard.credentials.length > 0;

  useEffect(() => {
    const refresh = () => setStoredCredentials(loadStoredCredentials());
    window.addEventListener(CREDENTIAL_STORAGE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CREDENTIAL_STORAGE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  function openTranscriptImport() {
    window.dispatchEvent(new Event(OPEN_TRANSCRIPT_IMPORT_EVENT));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex min-h-16 w-full max-w-[1240px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a
            className="min-w-0 no-underline"
            href="#main-content"
            aria-label="Credentials ホーム"
          >
            <strong className="block text-sm font-semibold tracking-tight text-foreground">
              Credentials
            </strong>
            <span className="hidden text-xs text-muted md:block">Microsoft資格管理</span>
          </a>

          {hasCredentials ? (
            <nav className="ml-5 hidden items-center gap-1 md:flex" aria-label="主要セクション">
              <a
                className="rounded-md px-3 py-2 text-sm font-medium text-muted no-underline hover:bg-surface-muted hover:text-foreground"
                href="#schedule"
              >
                予定
              </a>
              <a
                className="rounded-md px-3 py-2 text-sm font-medium text-muted no-underline hover:bg-surface-muted hover:text-foreground"
                href="#credentials"
              >
                資格
              </a>
            </nav>
          ) : null}

          <div className="ml-auto">
            <DataAndIntegrations credentialCount={dashboard.credentials.length} />
          </div>
        </div>
      </header>

      <div className="hidden">
        <TranscriptImport />
      </div>

      <main
        id="main-content"
        className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      >
        {!hasCredentials ? (
          <section className="mx-auto max-w-2xl py-10 sm:py-16" aria-labelledby="onboarding-title">
            <p className="text-sm font-semibold text-primary">Microsoft資格管理</p>
            <h1
              id="onboarding-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              資格情報を取り込んで始める
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
              Microsoft LearnのTranscriptをPDFとして保存し、このブラウザで取り込みます。解析した内容を確認してから資格情報として保存できます。
            </p>
            <div className="mt-6">
              <Button type="button" onClick={openTranscriptImport}>
                資格を取り込む
              </Button>
            </div>
            <div className="mt-8 border-t border-border pt-5 text-sm leading-6 text-muted">
              <strong className="font-semibold text-foreground">PDFは外部へ送信しません。</strong>
              <span className="ml-1">資格データもこのブラウザに保存されます。</span>
            </div>
          </section>
        ) : (
          <>
            <section aria-labelledby="overview-title">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1
                    id="overview-title"
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]"
                  >
                    更新状況
                  </h1>
                  <p className="mt-1 text-sm text-muted">次に必要な対応と期限を確認します。</p>
                </div>
                <p className="font-mono text-xs text-muted">
                  基準日 <time dateTime={referenceDate}>{formatReferenceDate(referenceDate)}</time>
                </p>
              </div>

              <nav className="mb-4 flex gap-4 text-sm md:hidden" aria-label="ページ内移動">
                <a className="font-medium text-primary no-underline" href="#schedule">
                  90日予定
                </a>
                <a className="font-medium text-primary no-underline" href="#credentials">
                  資格一覧
                </a>
              </nav>

              <PrimaryCredentialState
                credentials={dashboard.credentials}
                nextDeadline={dashboard.nextDeadline}
              />

              {refreshState.shouldPrompt ? (
                <section
                  className="freshness-banner mt-4 flex flex-col gap-3 border-l-2 border-warning bg-warning-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  aria-labelledby="freshness-title"
                >
                  <div className="min-w-0">
                    <h2 id="freshness-title" className="text-sm font-semibold text-foreground">
                      保存している資格情報を確認してください
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      更新可能時期を迎えた資格が{refreshState.credentials.length}件あります。
                      {refreshState.credentials.slice(0, 3).map((credential) => (
                        <span key={`refresh-${credential.id}`}>
                          {' '}
                          {credential.displayCode ?? credential.name}
                          {credential.renewalOpensOn
                            ? `（${formatFullDate(credential.renewalOpensOn)}から更新可能）`
                            : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                  <Button
                    className="sm:shrink-0"
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={openTranscriptImport}
                  >
                    Transcriptを再インポート
                  </Button>
                </section>
              ) : null}
            </section>

            <div className="mt-10">
              <RenewalTimeline
                referenceDate={referenceDate}
                endDate={timelineEnd}
                events={dashboard.scheduleEvents}
              />
            </div>

            <div className="mt-10">
              <CredentialRegister credentials={dashboard.credentials} />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>このブラウザに保存 · Transcript PDFから取り込み</span>
          <span>Microsoft Credentials Tracker</span>
        </div>
      </footer>
    </div>
  );
}
