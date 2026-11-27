export const RADAR_SENDER = 'carvio.team@gmail.com';
export const RADAR_TIME_ZONE = 'Asia/Jerusalem';
// Existing settings store frequency only. Two/week uses Sunday + Thursday.
export function radarScheduleSlot(now: Date, frequency: number): string | null {
  if (!Number.isFinite(now.getTime()) || ![2,3].includes(frequency)) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:RADAR_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const days = frequency===2 ? ['Sun','Thu'] : ['Sun','Tue','Thu'];
  // Small delay window for best-effort cron; never catch up at a different hour.
  if (!days.includes(parts.weekday) || parts.hour!=='09' || Number(parts.minute)>=15) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}
