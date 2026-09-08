import type { CSSProperties } from 'react';
import { TranscriptImport } from './components/TranscriptImport';
import { credentials, scheduleEvents, type CredentialStatus } from './mock-data';

const statusClass: Record<CredentialStatus, string> = {
  更新可能: 'status status-renewal',
  有効: 'status status-active',
  期限なし: 'status status-permanent',
};

const timelinePositions = [
  { left: '15%', event: scheduleEvents[0] },
  { left: '46%', event: scheduleEvents[1] },
  { left: '50%', event: scheduleEvents[2] },
  { left: '77%', event: scheduleEvents[3] },
];

const calendarDays = [
  null,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  null,
  null,
  null,
  null,
];

const calendarWeeks = Array.from({ length: 5 }, (_, weekIndex) => ({
  id: `week-${weekIndex + 1}`,
  days: calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => ({
    id: day ? `day-${day}` : `empty-${weekIndex + 1}-${dayIndex + 1}`,
    day,
  })),
}));

function StatusText({ status }: { status: CredentialStatus }) {
  return (
    <span className={statusClass[status]}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export default function App() {
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
          <TranscriptImport />
          <span className="mock-label">Mock data</span>
        </div>
      </header>

      <main id="main-content" className="page-frame">
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
              サンプル基準日 <time dateTime="2026-09-08">2026.09.08</time>
            </p>
          </div>

          <section className="next-action" aria-label="次に対応が必要な資格">
            <div className="deadline-date">
              <span>次の期限</span>
              <strong>10.19</strong>
              <small>2026 / Mon</small>
            </div>
            <div className="deadline-credential">
              <div className="credential-code">AZ-104</div>
              <h2>Azure Administrator Associate</h2>
              <StatusText status="更新可能" />
              <p>有効期限までに更新アセスメントを完了します。</p>
            </div>
            <div className="days-left">
              <span className="sr-only">有効期限まで</span>
              <strong>41</strong>
              <span>日</span>
            </div>
          </section>
        </section>

        <section id="schedule" className="timeline-section" aria-labelledby="timeline-title">
          <div className="section-heading">
            <div>
              <p className="context-label">Sep — Nov 2026</p>
              <h2 id="timeline-title">90日スケジュール</h2>
            </div>
            <p>期限と予定を同じ時間軸で見る</p>
          </div>

          <div className="timeline-visual" aria-hidden="true">
            <div className="month-scale">
              <span>9月</span>
              <span>10月</span>
              <span>11月</span>
            </div>
            <div className="timeline-rail">
              {timelinePositions.map(({ left, event }) => (
                <div
                  className={`timeline-pin timeline-pin-${event.kind}`}
                  key={`${event.date}-${event.label}`}
                  style={{ '--pin-left': left } as CSSProperties}
                />
              ))}
            </div>
          </div>

          <ol className="timeline-events">
            {scheduleEvents.map((event) => (
              <li key={`${event.date}-${event.label}`}>
                <time dateTime={`2026-${event.date.replace('.', '-')}`}>{event.date}</time>
                <div>
                  <strong>{event.label}</strong>
                  <span>{event.detail}</span>
                </div>
                <span className={`event-key event-key-${event.kind}`}>
                  {event.kind === 'deadline' ? '期限' : event.kind === 'renewal' ? '更新' : '予定'}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="content-grid">
          <section id="credentials" className="register-section" aria-labelledby="credentials-title">
            <div className="section-heading register-heading">
              <div>
                <p className="context-label">4 credentials</p>
                <h2 id="credentials-title">資格一覧</h2>
              </div>
              <p>取得日・状態・期限を横並びで比較</p>
            </div>

            <div className="table-wrap">
              <table className="credential-table">
                <thead>
                  <tr>
                    <th scope="col">資格</th>
                    <th scope="col">取得日</th>
                    <th scope="col">状態</th>
                    <th scope="col">有効期限 / 次回</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((credential) => (
                    <tr key={credential.code}>
                      <td data-label="資格">
                        <span className="credential-code">{credential.code}</span>
                        <strong>{credential.name}</strong>
                      </td>
                      <td data-label="取得日" className="date-cell">
                        {credential.earnedOn}
                      </td>
                      <td data-label="状態">
                        <StatusText status={credential.status} />
                      </td>
                      <td data-label="有効期限 / 次回">
                        <span className="date-cell">{credential.expiresOn ?? '—'}</span>
                        <small>{credential.renewalNote}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="side-column" aria-label="今月と予定">
            <section className="calendar-section" aria-labelledby="calendar-title">
              <div className="section-heading compact-heading">
                <div>
                  <p className="context-label">September</p>
                  <h2 id="calendar-title">2026年9月</h2>
                </div>
                <span className="today-key">基準日 08</span>
              </div>

              <table className="calendar" aria-label="2026年9月のカレンダー">
                <thead>
                  <tr>
                    {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
                      <th scope="col" key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks.map((week) => (
                    <tr key={week.id}>
                      {week.days.map(({ id, day }) => (
                        <td
                          className={day === 8 ? 'is-today' : day === 22 ? 'has-event' : undefined}
                          key={id}
                        >
                          {day ? <span>{day}</span> : null}
                          {day === 22 ? (
                            <span className="calendar-event">
                              <span className="sr-only">SC-100 受験予定</span>
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
              <ol className="upcoming-list">
                {scheduleEvents.slice(0, 3).map((event) => (
                  <li key={`upcoming-${event.date}-${event.label}`}>
                    <time dateTime={`2026-${event.date.replace('.', '-')}`}>{event.date}</time>
                    <div>
                      <strong>{event.label}</strong>
                      <span>{event.detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>UI mock · no account data connected</span>
        <span>Microsoft Credentials Tracker</span>
      </footer>
    </div>
  );
}
