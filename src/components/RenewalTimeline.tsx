import type { CSSProperties } from 'react';
import {
  differenceInCalendarDays,
  type CredentialScheduleEvent,
} from '../domain/credential-projection';
import { formatMonthDay, parseIsoDate } from '../presentation/credential-view';

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

function timelinePosition(referenceDate: string, date: string): string {
  const offset = Math.max(0, Math.min(89, differenceInCalendarDays(date, referenceDate)));
  return `${((offset + 0.5) / 90) * 100}%`;
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

interface RenewalTimelineProps {
  referenceDate: string;
  endDate: string;
  events: CredentialScheduleEvent[];
}

export function RenewalTimeline({ referenceDate, endDate, events }: RenewalTimelineProps) {
  const months = monthSequence(referenceDate, endDate);

  return (
    <section id="schedule" className="scroll-mt-20" aria-labelledby="timeline-title">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {timelineContext(referenceDate, endDate)}
          </p>
          <h2 id="timeline-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            90日スケジュール
          </h2>
        </div>
        <p className="text-sm text-muted">更新開始と期限を同じ時間軸で確認</p>
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
              <span key={month.id}>{month.label}</span>
            ))}
          </div>
          <div className="timeline-rail">
            {events.map((event) => (
              <div
                className={`timeline-pin timeline-pin-${event.kind}`}
                key={event.id}
                style={{ '--pin-left': timelinePosition(referenceDate, event.date) } as CSSProperties}
              />
            ))}
          </div>
        </div>

        {events.length > 0 ? (
          <ol className="mt-4 grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {events.map((event) => (
              <li className="flex min-w-0 gap-3 px-1 py-3 sm:px-4" key={event.id}>
                <time className="shrink-0 font-mono text-xs font-semibold text-foreground" dateTime={event.date}>
                  {formatMonthDay(event.date)}
                </time>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-semibold leading-5 text-foreground">{event.label}</strong>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">{event.detail}</span>
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
