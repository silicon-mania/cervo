const DEFAULT_APP_TIME_ZONE = "America/Los_Angeles";

function getDatePart(parts: Intl.DateTimeFormatPart[], type: string) {
  const part = parts.find((item) => item.type === type);

  if (!part) {
    throw new Error(`Unable to resolve ${type} for daily note date.`);
  }

  return part.value;
}

export function getAppTimeZone() {
  return process.env.CERVO_APP_TIME_ZONE?.trim() || DEFAULT_APP_TIME_ZONE;
}

export function getDateKeyInTimeZone({
  date = new Date(),
  timeZone = getAppTimeZone(),
}: {
  date?: Date;
  timeZone?: string;
} = {}) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  const year = getDatePart(parts, "year");
  const month = getDatePart(parts, "month");
  const day = getDatePart(parts, "day");

  return `${year}-${month}-${day}`;
}

export function getDailyNoteTitle(dateKey: string) {
  return `Daily note - ${dateKey}`;
}
