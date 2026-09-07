import { mockCredentials, upcomingEvents, type MockCredential } from './mockCredentials';

function CredentialMark({ credential }: { credential: MockCredential }) {
  const [family, code] = credential.code.split('-');

  return (
    <div className={`credential-mark credential-mark--${credential.accent}`} aria-hidden="true">
      <span>{family}</span>
      <strong>{code}</strong>
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
          <span className="brand-index" aria-hidden="true">MC</span>
          <span className="brand-copy">
            <strong>Credential record</strong>
            <span>Microsoft certifications</span>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="record-mode">LOCAL RECORD</span>
          <span className="mock-badge">Mock data</span>
        </div>
      </header>

      <main id="top" className="page-content">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="hero-label"><span>Credential ledger</span><span>2026</span></p>
            <h1 id="page-title">資格の更新時期を、ひと目で。</h1>
            <p className="hero-copy">
              取得日、有効期限、次の更新。資格ごとの記録を時系列で整理します。
            </p>
          </div>
          <a className="text-link" href="#credentials">資格記録へ</a>
        </section>

        <section className="summary-ledger" aria-label="資格サマリー">
          <div className="summary-item">
            <span className="summary-index">01</span>
            <span className="summary-label">保有資格</span>
            <strong className="summary-value">4</strong>
            <span className="summary-note">credentials</span>
          </div>
          <div className="summary-item summary-item--attention">
            <span className="summary-index">02</span>
            <span className="summary-label">更新可能</span>
            <strong className="summary-value">1</strong>
            <span className="summary-note">renewal available</span>
          </div>
          <div className="summary-item">
            <span className="summary-index">03</span>
            <span className="summary-label">次の有効期限</span>
            <strong className="summary-value summary-value--date">42</strong>
            <span className="summary-note">days · 2026.10.19</span>
          </div>
        </section>

        <section className="renewal-record" aria-labelledby="renewal-title">
          <div className="renewal-main">
            <div className="section-label">
              <span>01</span>
              <strong>次の更新</strong>
            </div>
            <div className="renewal-status-row">
              <span className="status-label status-label--renew-now">
                <i aria-hidden="true" />
                更新可能
              </span>
              <span className="renewal-code">AZ-104</span>
            </div>
            <h2 id="renewal-title">Azure Administrator Associate</h2>
            <dl className="renewal-dates">
              <div>
                <dt>取得日</dt>
                <dd>2025.10.19</dd>
              </div>
              <div>
                <dt>有効期限</dt>
                <dd>2026.10.19</dd>
              </div>
            </dl>
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
          <div className="expiry-block" aria-label="期限まで42日">
            <span className="expiry-label">EXPIRES IN</span>
            <strong>42</strong>
            <span className="expiry-unit">DAYS</span>
            <time dateTime="2026-10-19">2026.10.19</time>
          </div>
        </section>

        <div className="content-grid">
          <section id="credentials" className="panel credentials-panel" aria-labelledby="credentials-title">
            <div className="panel-heading">
              <div className="section-label">
                <span>02</span>
                <strong>資格記録</strong>
              </div>
              <div className="panel-title-row">
                <h2 id="credentials-title">保有資格</h2>
                <span className="panel-count">4 records</span>
              </div>
            </div>

            <div className="credential-list">
              {mockCredentials.map((credential) => (
                <article className="credential-row" key={credential.id}>
                  <CredentialMark credential={credential} />
                  <div className="credential-copy">
                    <div className="credential-title-row">
                      <div>
                        <span className="credential-code">{credential.code}</span>
                        <h3>{credential.name}</h3>
                      </div>
                      <span className={`status-label status-label--${credential.status}`}>
                        <i aria-hidden="true" />
                        {credential.statusLabel}
                      </span>
                    </div>
                    <p>{credential.level}</p>
                    <dl className="credential-dates">
                      <div>
                        <dt>取得</dt>
                        <dd>{credential.earnedOn}</dd>
                      </div>
                      <div>
                        <dt>{credential.expiresOn ? '期限' : '期限'}</dt>
                        <dd>{credential.expiresOn ?? 'なし'}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="sidebar-stack" aria-label="更新予定">
            <section className="panel calendar-panel" aria-labelledby="calendar-title">
              <div className="panel-heading panel-heading--compact">
                <div className="section-label">
                  <span>03</span>
                  <strong>カレンダー</strong>
                </div>
                <div className="panel-title-row">
                  <h2 id="calendar-title">2026年9月</h2>
                  <span className="calendar-caption">Today · 07</span>
                </div>
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
                <div className="section-label">
                  <span>04</span>
                  <strong>予定</strong>
                </div>
                <div className="panel-title-row">
                  <h2 id="timeline-title">これから</h2>
                </div>
              </div>
              <ol className="timeline-list">
                {upcomingEvents.map((event) => (
                  <li key={`${event.date}-${event.label}`}>
                    <time className={`timeline-date timeline-date--${event.tone}`}>{event.date}</time>
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
        <span>UI mock / no account data connected</span>
      </footer>
    </div>
  );
}
