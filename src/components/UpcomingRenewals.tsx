import type { CredentialScheduleEvent } from '../domain/credential-projection';
import { formatMonthDay } from '../presentation/credential-view';

export function UpcomingRenewals({ events }: { events: CredentialScheduleEvent[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-surface sm:p-5" aria-labelledby="upcoming-title">
      <div className="mb-3">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted">Next 3</p>
        <h2 id="upcoming-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">直近の予定</h2>
      </div>
      {events.length > 0 ? (
        <ol className="divide-y divide-border border-t border-border">
          {events.slice(0, 3).map((event) => (
            <li className="flex gap-3 py-3" key={`upcoming-${event.id}`}>
              <time className="shrink-0 font-mono text-xs font-semibold text-foreground" dateTime={event.date}>
                {formatMonthDay(event.date)}
              </time>
              <div className="min-w-0">
                <strong className="block text-sm font-semibold leading-5 text-foreground">{event.label}</strong>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{event.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border-t border-border pt-4 text-sm text-muted">直近90日以内の予定はありません。</div>
      )}
    </section>
  );
}
