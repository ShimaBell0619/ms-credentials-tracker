import { mockCredentials, upcomingEvents, type MockCredential } from './mockCredentials';

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2v3M17 2v3M3.5 9h17M5.5 4.5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 2.8 8.3 7 10 4.2-1.7 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CredentialMark({ credential }: { credential: MockCredential }) {
  return (
    <div className={`credential-mark credential-mark--${credential.accent}`} aria-hidden="true">
      <span>{credential.code.split('-')[0]}</span>
    </div>
  );
}

const calendarDays = [
  'leading', 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
  28, 29, 30,
] as const;

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Microsoft Credentials Tracker ホーム">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <strong>Credentials</strong>
            <span>Microsoft tracker</span>
          </span>
        </a>
        <span className="mock-badge">Mock data</span>
      </header>

      <main id="top" className="page-content">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">MY CREDENTIALS</p>
            <h1 id="page-title">資格の更新時期を、ひと目で。</h1>
            <p className="hero-copy">
              取得したMicrosoft資格と更新予定を、ひとつのタイムラインで整理します。
            </p>
          </div>
          <a className="text-link" href="#credentials">
            資格一覧を見る
            <span aria-hidden="true">→</span>
          </a>
        </section>

        <section className="summary-grid" aria-label="資格サマリー">
          <article className="summary-card">
            <div className="summary-icon summary-icon--blue"><ShieldIcon /></div>
            <div>
              <span className="summary-label">保有資格</span>
              <strong className="summary-value">4</strong>
              <span className="summary-note">4 credentials</span>
            </div>
          </article>
          <article className="summary-card">
            <div className="summary-icon summary-icon--amber"><ClockIcon /></div>
            <div>
              <span className="summary-label">更新可能</span>
              <strong className="summary-value">1</strong>
              <span className="summary-note summary-note--warning">今すぐ更新できます</span>
            </div>
          </article>
          <article className="summary-card">
            <div className="summary-icon summary-icon--green"><CalendarIcon /></div>
            <div>
              <span className="summary-label">次の有効期限</span>
              <strong className="summary-value summary-value--date">42日</strong>
              <span className="summary-note">2026/10/19</span>
            </div>
          </article>
        </section>

        <section className="renewal-card" aria-labelledby="renewal-title">
          <div className="renewal-main">
            <div className="renewal-heading-row">
              <span className="status-pill status-pill--warning">Renew now</span>
              <span className="renewal-days">期限まで42日</span>
            </div>
            <p className="section-kicker">NEXT RENEWAL</p>
            <h2 id="renewal-title">Azure Administrator Associate</h2>
            <p className="renewal-meta">取得日 2025/10/19 · 有効期限 2026/10/19</p>
            <div
              className="renewal-progress"
              role="progressbar"
              aria-label="有効期限までの期間イメージ"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={84}
            >
              <span style={{ width: '84%' }} />
            </div>
            <div className="renewal-scale" aria-hidden="true">
              <span>取得</span><span>現在</span><span>期限</span>
            </div>
          </div>
          <div className="renewal-visual" aria-hidden="true">
            <div className="orb orb--outer"><div className="orb orb--inner">AZ</div></div>
          </div>
        </section>

        <div className="content-grid">
          <section id="credentials" className="panel credentials-panel" aria-labelledby="credentials-title">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">CREDENTIALS</p>
                <h2 id="credentials-title">保有資格</h2>
              </div>
              <span className="panel-count">4件</span>
            </div>

            <div className="credential-list">
              {mockCredentials.map((credential) => (
                <article className="credential-row" key={credential.id}>
                  <CredentialMark credential={credential} />
                  <div className="credential-copy">
                    <div className="credential-title-row">
                      <h3>{credential.name}</h3>
                      <span className={`status-pill status-pill--${credential.status}`}>
                        {credential.statusLabel}
                      </span>
                    </div>
                    <p>{credential.code} · {credential.level}</p>
                    <div className="credential-dates">
                      <span>取得 {credential.earnedOn}</span>
                      <span>{credential.expiresOn ? `期限 ${credential.expiresOn}` : '有効期限なし'}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="sidebar-stack" aria-label="更新予定">
            <section className="panel calendar-panel" aria-labelledby="calendar-title">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <p className="section-kicker">CALENDAR</p>
                  <h2 id="calendar-title">2026年9月</h2>
                </div>
                <span className="calendar-caption">Today 7</span>
              </div>
              <div className="calendar-weekdays" aria-hidden="true">
                {['月', '火', '水', '木', '金', '土', '日'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid">
                {calendarDays.map((day) => {
                  if (day === 'leading') {
                    return <span className="calendar-day calendar-day--empty" key="leading" />;
                  }
                  const isToday = day === 7;
                  const hasEvent = day === 15;
                  return (
                    <span className={`calendar-day${isToday ? ' calendar-day--today' : ''}${hasEvent ? ' calendar-day--event' : ''}`} key={day}>
                      {day}
                    </span>
                  );
                })}
              </div>
              <div className="calendar-legend">
                <span><i className="legend-dot legend-dot--today" />今日</span>
                <span><i className="legend-dot legend-dot--event" />予定あり</span>
              </div>
            </section>

            <section className="panel timeline-panel" aria-labelledby="timeline-title">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <p className="section-kicker">UPCOMING</p>
                  <h2 id="timeline-title">これからの予定</h2>
                </div>
              </div>
              <ol className="timeline-list">
                {upcomingEvents.map((event) => (
                  <li key={`${event.date}-${event.label}`}>
                    <div className={`timeline-date timeline-date--${event.tone}`}>{event.date}</div>
                    <div><strong>{event.label}</strong><span>{event.detail}</span></div>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <span>Microsoft Credentials Tracker</span>
        <span>UI mock · no account data is connected</span>
      </footer>
    </div>
  );
}
