import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ManualCredentialDialog } from './components/ManualCredentialDialog';
import {
  OPEN_TRANSCRIPT_IMPORT_EVENT,
  TranscriptImport,
} from './components/TranscriptImport';
import { getCredentialDefinition } from './domain/credential-catalog';
import { buildTranscriptRefreshState } from './domain/credential-freshness';
import {
  addDaysIso,
  buildCredentialDashboard,
  differenceInCalendarDays,
  localDateToIso,
  type CredentialDerivedStatus,
  type CredentialProjection,
  type CredentialScheduleEvent,
} from './domain/credential-projection';
import {
  CREDENTIAL_STORAGE_CHANGED_EVENT,
  loadStoredCredentials,
  setCredentialArchived,
  type StoredCredential,
} from './storage/local-credential-store';

const statusText: Record<CredentialDerivedStatus, string> = {
  active: '有効',
  renewalAvailable: '更新可能',
  expired: '期限切れ',
  nonExpiring: '期限なし',
};

const statusClass: Record<CredentialDerivedStatus, string> = {
  active: 'status status-active',
  renewalAvailable: 'status status-renewal',
  expired: 'status status-expired',
  nonExpiring: 'status status-permanent',
};

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatFullDate(value: string | null): string {
  return value ? value.replaceAll('-', '.') : '—';
}

function formatMonthDay(value: string): string {
  return value.slice(5).replace('-', '.');
}

function formatDeadlineMeta(value: string): string {
  const date = parseIsoDate(value);
  const weekday = new Intl.DateTimeFormat('ja-JP', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(date);
  return `${date.getUTCFullYear()} / ${weekday}`;
}

function formatReferenceDate(value: string): string {
  return value.replaceAll('-', '.');
}

function renewalNote(credential: CredentialProjection): string {
  switch (credential.status) {
    case 'nonExpiring':
      return '更新不要';
    case 'expired':
      return '有効期限を過ぎています';
    case 'renewalAvailable':
      return '更新アセスメントを受験できます';
    case 'active':
      return credential.renewalOpensOn
        ? `${formatFullDate(credential.renewalOpensOn)} から更新可能`
        : '有効期限を確認してください';
  }
}

function timelinePosition(referenceDate: string, date: string): string {
  const offset = Math.max(0, Math.min(89, differenceInCalendarDays(date, referenceDate)));
  return `${((offset + 0.5) / 90) * 100}%`;
}

interface TimelineMonth {
  id: string;
  label: string;
  days: number;
}

function monthSequence(start: string, end: string): TimelineMonth[] {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const endExclusive = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  const months: TimelineMonth[] = [];
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

  while (cursor <= endDate) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const nextMonth = new Date(Date.UTC(year, month + 1, 1));
    const segmentStart = cursor < startDate ? startDate : cursor;
    const segmentEnd = nextMonth < endExclusive ? nextMonth : endExclusive;
    const days = Math.max(
      1,
      Math.round((segmentEnd.getTime() - segmentStart.getTime()) / (24 * 60 * 60 * 1000)),
    );

    months.push({ id: `${year}-${month + 1}`, label: `${month + 1}月`, days });
    cursor = nextMonth;
  }

  return months;
}

function timelineContext(start: string, end: string): string {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
  const startMonth = formatter.format(startDate);
  const endMonth = formatter.format(endDate);
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  return startYear === endYear
    ? `${startMonth} — ${endMonth} ${endYear}`
    : `${startMonth} ${startYear} — ${endMonth} ${endYear}`;
}

interface CalendarCell {
  id: string;
  day: number | null;
  events: CredentialScheduleEvent[];
}

function buildCalendar(referenceDate: string, events: CredentialScheduleEvent[]) {
  const reference = parseIsoDate(referenceDate);
  const year = reference.getUTCFullYear();
  const monthIndex = reference.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const mondayOffset = (firstDay + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let index = 0; index < mondayOffset; index += 1) {
    cells.push({ id: `leading-${index}`, day: null, events: [] });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      id: iso,
      day,
      events: events.filter((event) => event.date === iso),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ id: `trailing-${cells.length}`, day: null, events: [] });
  }

  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => ({
    id: `week-${index}`,
    days: cells.slice(index * 7, index * 7 + 7),
  }));

  return {
    year,
    month: monthIndex + 1,
    monthName: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(reference),
    referenceDay: reference.getUTCDate(),
    weeks,
  };
}

function StatusText({ status }: { status: CredentialDerivedStatus }) {
  return (
    <span className={statusClass[status]}>
      <span className="status-dot" aria-hidden="true" />
      {statusText[status]}
    </span>
  );
}

export default function App() {
  const [storedCredentials, setStoredCredentials] = useState(() => loadStoredCredentials());
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<StoredCredential | null>(null);
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
  const archivedCredentials = useMemo(
    () => storedCredentials.filter((credential) => credential.archivedAt),
    [storedCredentials],
  );
  const storedById = useMemo(
    () => new Map(storedCredentials.map((credential) => [credential.id, credential] as const)),
    [storedCredentials],
  );
  const months = monthSequence(referenceDate, timelineEnd);
  const calendar = buildCalendar(referenceDate, dashboard.scheduleEvents);

  useEffect(() => {
    const refresh = () => setStoredCredentials(loadStoredCredentials());
    window.addEventListener(CREDENTIAL_STORAGE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CREDENTIAL_STORAGE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  function openManualEditor(credential: StoredCredential | null) {
    setEditingCredential(credential);
    setManualDialogOpen(true);
  }

  function closeManualEditor() {
    setManualDialogOpen(false);
    setEditingCredential(null);
  }

  function openTranscriptImport() {
    window.dispatchEvent(new Event(OPEN_TRANSCRIPT_IMPORT_EVENT));
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>

      <header className="site-header">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">C</span>
          <div>
            <strong>Credentials</strong>
            <span>Microsoft certification tracker</span>
          </div>
        </div>

        <nav className="header-nav" aria-label="主要セクション">
          <a href="#credentials">資格</a>
          <a href="#schedule">予定</a>
        </nav>

        <div className="header-meta">
          <button className="manual-trigger" type="button" onClick={() => openManualEditor(null)}>
            手動追加
          </button>
          <TranscriptImport />
          <span className="mock-label">Local data</span>
        </div>
      </header>

      <main id="main-content" className="page-frame">
        {refreshState.shouldPrompt ? (
          <section className="freshness-banner" aria-labelledby="freshness-title">
            <div className="freshness-copy">
              <p className="context-label">Transcript refresh</p>
              <h2 id="freshness-title">資格情報を確認してください</h2>
              <p>
                更新可能時期を迎えた資格が{refreshState.credentials.length}件あります。Microsoft Learn Transcriptを再インポートして最新状態を確認してください。
              </p>
              <ul>
                {refreshState.credentials.slice(0, 3).map((credential) => (
                  <li key={`refresh-${credential.id}`}>
                    {credential.displayCode ?? credential.name}
                    {credential.renewalOpensOn ? ` · ${formatFullDate(credential.renewalOpensOn)}から更新可能` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <button className="primary-action" type="button" onClick={openTranscriptImport}>
              Transcriptを再インポート
            </button>
          </section>
        ) : null}

        <section className="overview" aria-labelledby="overview-title">
          <div className="overview-copy">
            <h1
              id="overview-title"
              style={{
                fontSize: '24px',
                lineHeight: 1.3,
                letterSpacing: '-0.025em',
                fontWeight: 700,
              }}
            >
              資格の更新予定
            </h1>
            <p className="date-cell" style={{ marginTop: '10px', fontSize: '11px', lineHeight: 1.4 }}>
              基準日 <time dateTime={referenceDate}>{formatReferenceDate(referenceDate)}</time>
            </p>
          </div>

          {dashboard.nextDeadline?.currentExpiresOn ? (
            <section className="next-action" aria-label="次に対応が必要な資格">
              <div className="deadline-date">
                <span>次の期限</span>
                <strong>{formatMonthDay(dashboard.nextDeadline.currentExpiresOn)}</strong>
                <small>{formatDeadlineMeta(dashboard.nextDeadline.currentExpiresOn)}</small>
              </div>
              <div className="deadline-credential">
                <div className="credential-code">{dashboard.nextDeadline.displayCode ?? 'Credential'}</div>
                <h2>{dashboard.nextDeadline.name}</h2>
                <StatusText status={dashboard.nextDeadline.status} />
                <p>{renewalNote(dashboard.nextDeadline)}</p>
              </div>
              <div className="days-left">
                <span className="sr-only">有効期限まで</span>
                <strong>{dashboard.nextDeadline.daysUntilExpiry ?? 0}</strong>
                <span>日</span>
              </div>
            </section>
          ) : dashboard.credentials.length === 0 ? (
            <section className="next-action next-action-empty" aria-label="資格データ未登録">
              <div>
                <p className="context-label">Get started</p>
                <h2>まだ資格データがありません</h2>
                <p>Microsoft Learn の Transcript PDF を取り込むか、資格を手動で追加してください。</p>
              </div>
            </section>
          ) : (
            <section className="next-action next-action-empty" aria-label="今後の資格期限なし">
              <div>
                <p className="context-label">No upcoming deadline</p>
                <h2>今後の有効期限はありません</h2>
                <p>登録済み資格の状態は資格一覧で確認できます。</p>
              </div>
            </section>
          )}
        </section>

        <section id="schedule" className="timeline-section" aria-labelledby="timeline-title">
          <div className="section-heading">
            <div>
              <p className="context-label">{timelineContext(referenceDate, timelineEnd)}</p>
              <h2 id="timeline-title">90日スケジュール</h2>
            </div>
            <p>更新開始と期限を同じ時間軸で見る</p>
          </div>

          <div className="timeline-visual" aria-hidden="true">
            <div
              className="month-scale live-month-scale"
              style={{
                gridTemplateColumns: months.map((month) => `minmax(0, ${month.days}fr)`).join(' '),
              }}
            >
              {months.map((month) => <span key={month.id}>{month.label}</span>)}
            </div>
            <div className="timeline-rail live-timeline-rail">
              {dashboard.scheduleEvents.map((event) => (
                <div
                  className={`timeline-pin timeline-pin-${event.kind}`}
                  key={event.id}
                  style={{ '--pin-left': timelinePosition(referenceDate, event.date) } as CSSProperties}
                />
              ))}
            </div>
          </div>

          {dashboard.scheduleEvents.length > 0 ? (
            <ol className="timeline-events live-timeline-events">
              {dashboard.scheduleEvents.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.date}>{formatMonthDay(event.date)}</time>
                  <div>
                    <strong>{event.label}</strong>
                    <span>{event.detail}</span>
                  </div>
                  <span className={`event-key event-key-${event.kind}`}>
                    {event.kind === 'deadline' ? '期限' : '更新'}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="section-empty">90日以内の更新開始・有効期限はありません。</div>
          )}
        </section>

        <div className="content-grid">
          <section id="credentials" className="register-section" aria-labelledby="credentials-title">
            <div className="section-heading register-heading">
              <div>
                <p className="context-label">{dashboard.credentials.length} credentials</p>
                <h2 id="credentials-title">資格一覧</h2>
              </div>
              <button className="secondary-action" type="button" onClick={() => openManualEditor(null)}>
                資格を追加
              </button>
            </div>

            {dashboard.credentials.length > 0 ? (
              <div className="table-wrap">
                <table className="credential-table">
                  <thead>
                    <tr>
                      <th scope="col">資格</th>
                      <th scope="col">取得日</th>
                      <th scope="col">状態</th>
                      <th scope="col">有効期限 / 次回</th>
                      <th scope="col">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.credentials.map((credential) => {
                      const stored = storedById.get(credential.id);
                      return (
                        <tr key={credential.id}>
                          <td data-label="資格">
                            <span className="credential-code">{credential.displayCode ?? '—'}</span>
                            <strong>{credential.name}</strong>
                          </td>
                          <td data-label="取得日" className="date-cell">
                            {formatFullDate(credential.firstEarnedOn)}
                          </td>
                          <td data-label="状態">
                            <StatusText status={credential.status} />
                          </td>
                          <td data-label="有効期限 / 次回">
                            <span className="date-cell">{formatFullDate(credential.currentExpiresOn)}</span>
                            <small>{renewalNote(credential)}</small>
                          </td>
                          <td data-label="操作">
                            {stored ? (
                              <div className="credential-actions">
                                <button type="button" onClick={() => openManualEditor(stored)}>修正</button>
                                <button type="button" onClick={() => setCredentialArchived(stored.id, true)}>アーカイブ</button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="register-empty">
                <strong>登録済みの資格はありません</strong>
                <span>Transcript PDFを取り込むか、資格を手動で追加してください。</span>
              </div>
            )}

            {archivedCredentials.length > 0 ? (
              <details className="archived-credentials">
                <summary>アーカイブ済み {archivedCredentials.length}件</summary>
                <ul>
                  {archivedCredentials.map((credential) => {
                    const definition = getCredentialDefinition(credential.credentialDefinitionId);
                    return (
                      <li key={`archived-${credential.id}`}>
                        <div>
                          <strong>{definition?.displayCode ?? 'Credential'}</strong>
                          <span>{definition?.canonicalTitle ?? credential.sourceTitle}</span>
                        </div>
                        <button type="button" onClick={() => setCredentialArchived(credential.id, false)}>
                          元に戻す
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </section>

          <aside className="side-column" aria-label="今月と予定">
            <section className="calendar-section" aria-labelledby="calendar-title">
              <div className="section-heading compact-heading">
                <div>
                  <p className="context-label">{calendar.monthName}</p>
                  <h2 id="calendar-title">{calendar.year}年{calendar.month}月</h2>
                </div>
                <span className="today-key">基準日 {String(calendar.referenceDay).padStart(2, '0')}</span>
              </div>

              <table className="calendar" aria-label={`${calendar.year}年${calendar.month}月のカレンダー`}>
                <thead>
                  <tr>
                    {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
                      <th scope="col" key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendar.weeks.map((week) => (
                    <tr key={week.id}>
                      {week.days.map(({ id, day, events }) => (
                        <td
                          className={[
                            day === calendar.referenceDay ? 'is-today' : '',
                            events.length > 0 ? 'has-event' : '',
                          ].filter(Boolean).join(' ') || undefined}
                          key={id}
                        >
                          {day ? <span>{day}</span> : null}
                          {events.length > 0 ? (
                            <span className="calendar-event">
                              <span className="sr-only">{events.map((event) => event.label).join('、')}</span>
                            </span>
                          ) : null}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="upcoming-section" aria-labelledby="upcoming-title">
              <div className="section-heading compact-heading">
                <div>
                  <p className="context-label">Next 3</p>
                  <h2 id="upcoming-title">直近の予定</h2>
                </div>
              </div>
              {dashboard.scheduleEvents.length > 0 ? (
                <ol className="upcoming-list">
                  {dashboard.scheduleEvents.slice(0, 3).map((event) => (
                    <li key={`upcoming-${event.id}`}>
                      <time dateTime={event.date}>{formatMonthDay(event.date)}</time>
                      <div>
                        <strong>{event.label}</strong>
                        <span>{event.detail}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="upcoming-empty">直近90日以内の予定はありません。</div>
              )}
            </section>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>Browser-local data · Microsoft Learn PDF import</span>
        <span>Microsoft Credentials Tracker</span>
      </footer>

      <ManualCredentialDialog
        open={manualDialogOpen}
        credential={editingCredential}
        onClose={closeManualEditor}
      />
    </div>
  );
}
