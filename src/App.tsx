import { mockCredentials, upcomingEvents } from './mockCredentials';

// Dates and states describe the fixed sample, not the viewer's current account.
const calendarWeeks = [
  [null, 1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12, 13],
  [14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30, null, null, null, null],
];

function RecordDate({ value }: { value: string }) {
  return <time dateTime={value.replaceAll('/', '-')}>{value}</time>;
}

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#credentials">
        資格記録へスキップ
      </a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Microsoft Credentials Tracker ホーム">
          <strong>資格記録</strong>
          <span>Microsoft certifications</span>
        </a>
        <span className="mock-label">Mock data</span>
      </header>
      <main id="top" className="page-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">資格の更新時期を、ひと目で。</h1>
            <p>取得から次の更新まで、Microsoft資格の記録。</p>
          </div>
          <p className="sample-date">
            サンプル基準日
            <RecordDate value="2026/09/07" />
          </p>
        </section>
        <div className="content-grid">
          <div className="records-column">
            <section className="renewal-record" aria-labelledby="renewal-title">
              <div className="renewal-heading">
                <h2 id="renewal-title">次の更新</h2>
                <span className="status-label status-label--renew-now">更新可能</span>
              </div>
              <div className="renewal-body">
                <div className="renewal-credential">
                  <p className="exam-code">
                    関連試験 <span>AZ-104</span>
                  </p>
                  <h3>Azure Administrator Associate</h3>
                  <p className="earned-date">
                    取得日 <RecordDate value="2025/10/19" />
                  </p>
                  <a className="text-link" href="#record-az-104">
                    資格記録を見る<span aria-hidden="true"> →</span>
                  </a>
                </div>
                <div className="renewal-deadline">
                  <span className="date-label">有効期限</span>
                  <time dateTime="2026-10-19">
                    <span className="deadline-year">2026</span>
                    <strong>
                      10<span className="date-divider">/</span>19
                    </strong>
                  </time>
                  <p>
                    期限まで <strong>42</strong> 日
                  </p>
                </div>
              </div>
            </section>
            <section
              id="credentials"
              className="credentials-section"
              aria-labelledby="credentials-title"
              tabIndex={-1}
            >
              <div className="section-heading">
                <h2 id="credentials-title">保有資格</h2>
                <p className="record-count">
                  4件<span>更新可能 1件</span>
                </p>
              </div>
              <div className="ledger-columns" aria-hidden="true">
                <span>資格 / 状態</span>
                <span>取得日</span>
                <span>有効期限</span>
              </div>
              <div className="credential-list">
                {mockCredentials.map((credential) => (
                  <article
                    id={`record-${credential.id}`}
                    className="credential-row"
                    key={credential.id}
                    tabIndex={-1}
                    aria-labelledby={`title-${credential.id}`}
                  >
                    <div className="credential-identity">
                      <h3 id={`title-${credential.id}`}>{credential.name}</h3>
                      <div className="credential-meta">
                        <p className="exam-code">
                          関連試験 <span>{credential.examCode}</span>
                        </p>
                        <span className={`status-label status-label--${credential.status}`}>
                          {credential.statusLabel}
                        </span>
                      </div>
                    </div>
                    <dl className="credential-dates">
                      <div>
                        <dt>取得日</dt>
                        <dd>
                          <RecordDate value={credential.earnedOn} />
                        </dd>
                      </div>
                      <div>
                        <dt>有効期限</dt>
                        <dd
                          className={
                            credential.status === 'renew-now' ? 'date-attention' : undefined
                          }
                        >
                          {credential.expiresOn ? (
                            <RecordDate value={credential.expiresOn} />
                          ) : (
                            '期限なし'
                          )}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
              <p className="ledger-note">
                試験コードは関連試験を示します。資格の識別番号ではありません。
              </p>
            </section>
          </div>
          <aside className="schedule-column" aria-label="更新予定">
            <section className="agenda-section" aria-labelledby="timeline-title">
              <div className="section-heading">
                <h2 id="timeline-title">これからの予定</h2>
                <span className="section-note">2026年</span>
              </div>
              <ol className="agenda-list">
                {upcomingEvents.map((event) => (
                  <li key={`${event.date}-${event.label}`}>
                    <time dateTime={event.isoDate} className="agenda-date">
                      {event.date}
                    </time>
                    <div>
                      <strong className="agenda-label">{event.label}</strong>
                      <span className="agenda-detail">{event.detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="schedule-note">予定はサンプルです。通知は送信されません。</p>
            </section>
            <section className="calendar-section" aria-labelledby="calendar-title">
              <div className="section-heading">
                <h2 id="calendar-title">2026年9月</h2>
                <span className="section-note">カレンダー</span>
              </div>
              <table className="calendar">
                <caption className="sr-only">
                  2026年9月。7日はサンプル基準日、15日は更新リマインドの予定日です。
                </caption>
                <thead>
                  <tr>
                    {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
                      <th scope="col" key={day}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks.map((week) => (
                    <tr key={week.find((day) => day !== null)}>
                      {week.map((day, index) => (
                        <td key={day ?? `empty-${index}`}>
                          {day !== null && (
                            <time
                              dateTime={`2026-09-${String(day).padStart(2, '0')}`}
                              className={`calendar-day${day === 7 ? ' calendar-day--reference' : ''}${day === 15 ? ' calendar-day--event' : ''}`}
                            >
                              <span aria-hidden="true">{day}</span>
                              <span className="sr-only">{`9月${day}日${day === 7 ? '、サンプル基準日' : day === 15 ? '、更新リマインド' : ''}`}</span>
                            </time>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="calendar-legend">
                <span>
                  <i className="reference-key" aria-hidden="true" />
                  基準日 7日
                </span>
                <span>
                  <i className="event-key" aria-hidden="true" />
                  予定 15日
                </span>
              </p>
            </section>
          </aside>
        </div>
      </main>
      <footer className="footer">
        <span>Microsoft Credentials Tracker</span>
        <span>UIモック · アカウント未連携</span>
      </footer>
    </div>
  );
}
