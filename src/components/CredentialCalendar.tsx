import type { CredentialScheduleEvent } from '../domain/credential-projection';
import { parseIsoDate } from '../presentation/credential-view';

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

interface CredentialCalendarProps {
  referenceDate: string;
  events: CredentialScheduleEvent[];
}

export function CredentialCalendar({ referenceDate, events }: CredentialCalendarProps) {
  const calendar = buildCalendar(referenceDate, events);

  return (
    <section
      className="calendar-section rounded-xl border border-border bg-surface p-4 shadow-surface sm:p-5"
      aria-labelledby="calendar-title"
    >
      <div className="local-calendar-content">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              {calendar.monthName}
            </p>
            <h2 id="calendar-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {calendar.year}年{calendar.month}月
            </h2>
          </div>
          <span className="text-xs font-medium text-muted">
            基準日 {String(calendar.referenceDay).padStart(2, '0')}
          </span>
        </div>

        <table className="w-full table-fixed" aria-label={`${calendar.year}年${calendar.month}月のカレンダー`}>
          <thead>
            <tr>
              {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
                <th className="pb-2 text-center text-[10px] font-semibold text-muted" scope="col" key={day}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendar.weeks.map((week) => (
              <tr key={week.id}>
                {week.days.map(({ id, day, events: dayEvents }) => {
                  const isReference = day === calendar.referenceDay;
                  return (
                    <td className="h-9 p-0.5 text-center align-middle" key={id}>
                      {day ? (
                        <div
                          className={[
                            'relative mx-auto grid size-8 place-items-center rounded-md text-xs',
                            isReference ? 'bg-primary text-white font-semibold' : 'text-foreground',
                          ].join(' ')}
                        >
                          {day}
                          {dayEvents.length > 0 ? (
                            <span
                              className={[
                                'absolute bottom-0.5 size-1 rounded-full',
                                isReference ? 'bg-white' : 'bg-warning',
                              ].join(' ')}
                            >
                              <span className="sr-only">{dayEvents.map((event) => event.label).join('、')}</span>
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
