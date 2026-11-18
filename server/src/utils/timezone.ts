export interface ZonedDateParts {
  date: string;
  weekday: number;
  minutes: number;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getParts(timeZone: string, date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

export function getZonedDateParts(timeZone: string, instant = new Date()): ZonedDateParts {
  const parts = getParts(timeZone, instant);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function localDateTimeToInstant(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetLocalMillis = Date.UTC(year, month - 1, day, hour, minute);
  let candidateMillis = targetLocalMillis;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getParts(timeZone, new Date(candidateMillis));
    const representedLocalMillis = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const correction = targetLocalMillis - representedLocalMillis;
    if (correction === 0) break;
    candidateMillis += correction;
  }

  return new Date(candidateMillis);
}
