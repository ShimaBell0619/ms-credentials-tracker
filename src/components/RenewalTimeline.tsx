import type { CSSProperties } from 'react';
import {
  differenceInCalendarDays,
  type CredentialScheduleEvent,
} from '../domain/credential-projection';
import { formatMonthDay, parseIsoDate } from '../presentation/credential-view';

interface TimelineMonth {
  id: string;
  month: number;
  days: number;
}

interface EventGroup {
  date: string;
  events: CredentialScheduleEvent[];
}

function monthSequence(start: string, end: string): TimelineMonth[] {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const endExclusive = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  const months: TimelineMonth[] = [];
  let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

  while (cursor <= endDate) {
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();
    const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
    const segmentStart = cursor < startDate ? startDate : cursor;
    const segmentEnd = nextMonth < endExclusive ? nextMonth : endExclusive;
    const days = Math.max(
      1,
      Math.round((segmentEnd.getTime() - segmentStart.getTime()) / (24 * 60 * 60 * 1000)),
    );

    months.push({ id: `${year}-${monthIndex + 1}`, month: monthIndex + 1, days });
    cursor = nextMonth;
  }

  return months;
}

function timelinePosition(referenceDate: string, date: string): string {
  const offset = Math.max(0, Math.min(89, differenceInCalendarDays(date, referenceDate)));
  return `${((offset + 0.5) / 90) * 100}%`;
}

function timelineContext(start: string, end: string): string {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth() + 1;
  const endMonth = endDate.getUTCMonth() + 1;
  return startYear === endYear
    ? `${startYear}年${startMonth}月 — ${endMonth}月`
    : `${startYear}年${startMonth}月 — ${endYear}年${endMonth}月`;
}

function groupEvents(events: CredentialScheduleEvent[]): EventGroup[] {
  const groups = new Map<string, CredentialScheduleEvent[]>();
  for (const event of events) {
    const current = groups.get(event.date) ?? [];
    current.push(event);
    groups.set(event.date, current);
  }
  return Array.from(groups, ([date, grouped]) => ({ date, events: grouped }));
}

interface RenewalTimelineProps {
  referenceDate: string;
  endDate: string;
  events: CredentialScheduleEvent[];
}

export function RenewalTimeline({ referenceDate, endDate, events }: RenewalTimelineProps) {
  const months = monthSequence(referenceDate, endDate);
  const eventGroups = groupEvents(events);

  return (
    <section id="schedule" className="scroll-mt-20" aria-labelledby="timeline-title">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="timeline-title" className="text-xl font-semibold tracking-tight text-foreground">
            90日スケジュール
          </h2>
          <p className="mt-1 text-sm text-muted">更新開始と期限を日付順に確認します。</p>
        </div>
        <p className="font-mono text-xs text-muted">{timelineContext(referenceDate, endDate)}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 shadow-surface sm:p-5">
        <div className="timeline-visual" aria-hidden="true">
          <div
            className="month-scale"
            style={{
              gridTemplateColumns: months.map((month) => `minmax(0, ${month.days}fr)`).join(' '),
            }}
          >
            {months.map((month) => (
              <span key={month.id} className={month.days >= 10 ? undefined : 'max-sm:text-transparent'}>
                {month.month}
                <span className="hidden sm:inline">月</span>
              </span>
            ))}
          </div>
          <div className="timeline-rail live-timeline-rail">
            {eventGroups.map((group) => {
              const hasDeadline = group.events.some((event) => event.kind === 'deadline');
              return (
                <div
                  className={`timeline-pin ${hasDeadline ? 'timeline-pin-deadline' : 'timeline-pin-renewal'}`}
                  key={group.date}
                  style={{ '--pin-left': timelinePosition(referenceDate, group.date) } as CSSProperties}
                />
              );
            })}
          </div>
        </div>

        {eventGroups.length > 0 ? (
          <ol className="mt-4 divide-y divide-border border-t border-border">
            {eventGroups.map((group) => (
              <li
                className="grid gap-3 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-5"
                key={group.date}
              >
                <time
                  className="font-mono text-xs font-semibold text-foreground"
                  dateTime={group.date}
                >
                  {formatMonthDay(group.date)}
                </time>
                <div className="grid gap-2">
                  {group.events.map((event) => (
                    <div
                      className="flex min-w-0 items-start justify-between gap-3"
                      key={event.id}
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm font-semibold leading-5 text-foreground">
                          {event.label}
                        </strong>
                        <span className="mt-0.5 block text-xs leading-5 text-muted">
                          {event.detail}
                        </span>
                      </div>
                      <span
                        className={
                          event.kind === 'deadline'
                            ? 'shrink-0 text-xs font-semibold text-warning'
                            : 'shrink-0 text-xs font-semibold text-primary'
                        }
                      >
                        {event.kind === 'deadline' ? '期限' : '更新'}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
            90日以内の更新開始・有効期限はありません。
          </div>
        )}
      </div>
    </section>
  );
}
