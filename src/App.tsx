import { useEffect, useMemo, useState } from 'react';
import { CredentialCalendar } from './components/CredentialCalendar';
import { CredentialRegister } from './components/CredentialRegister';
import { NextRenewal } from './components/NextRenewal';
import { RenewalTimeline } from './components/RenewalTimeline';
import {
  OPEN_TRANSCRIPT_IMPORT_EVENT,
  TranscriptImport,
} from './components/TranscriptImport';
import { UpcomingRenewals } from './components/UpcomingRenewals';
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
        <div className="mx-auto flex min-h-16 w-full max-w-[1380px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a className="flex min-w-0 items-center gap-3 no-underline" href="#main-content" aria-label="Credentials ホーム">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft font-mono text-sm font-bold text-primary">
              C
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm font-semibold tracking-tight text-foreground">Credentials</strong>
              <span className="hidden text-xs text-muted sm:block">Microsoft certification tracker</span>
            </span>
          </a>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="主要セクション">
            <a className="rounded-md px-3 py-2 text-sm font-medium text-muted no-underline hover:bg-surface-muted hover:text-foreground" href="#credentials">
              資格
            </a>
            <a className="rounded-md px-3 py-2 text-sm font-medium text-muted no-underline hover:bg-surface-muted hover:text-foreground" href="#schedule">
              予定
            </a>
          </nav>

          <div className="header-meta ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            <TranscriptImport />
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              Local data
            </span>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1380px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {refreshState.shouldPrompt ? (
          <section className="freshness-banner mb-7 flex flex-col gap-4 rounded-xl border border-warning/25 bg-warning-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-labelledby="freshness-title">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-warning">Transcript refresh</p>
              <h2 id="freshness-title" className="mt-1 text-base font-semibold text-foreground">資格情報を確認してください</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                更新可能時期を迎えた資格が{refreshState.credentials.length}件あります。Microsoft Learn Transcriptを再インポートして最新状態を確認してください。
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {refreshState.credentials.slice(0, 3).map((credential) => (
                  <li key={`refresh-${credential.id}`}>
                    {credential.displayCode ?? credential.name}
                    {credential.renewalOpensOn ? ` · ${formatFullDate(credential.renewalOpensOn)}から更新可能` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <Button className="sm:shrink-0" size="sm" type="button" onClick={openTranscriptImport}>
              Transcriptを再インポート
            </Button>
          </section>
        ) : null}

        <section aria-labelledby="overview-title">
          <div className="mb-5">
            <h1 id="overview-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              資格の更新予定
            </h1>
            <p className="mt-1 font-mono text-xs text-muted">
              基準日 <time dateTime={referenceDate}>{formatReferenceDate(referenceDate)}</time>
            </p>
          </div>

          <NextRenewal credential={dashboard.nextDeadline} credentialCount={dashboard.credentials.length} />
        </section>

        <div className="mt-10">
          <RenewalTimeline
            referenceDate={referenceDate}
            endDate={timelineEnd}
            events={dashboard.scheduleEvents}
          />
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          <CredentialRegister credentials={dashboard.credentials} />

          <aside className="grid min-w-0 gap-6" aria-label="今月と予定">
            <CredentialCalendar referenceDate={referenceDate} events={dashboard.scheduleEvents} />
            <UpcomingRenewals events={dashboard.scheduleEvents} />
          </aside>
        </div>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Browser-local data · Microsoft Learn PDF import</span>
          <span>Microsoft Credentials Tracker</span>
        </div>
      </footer>
    </div>
  );
}
