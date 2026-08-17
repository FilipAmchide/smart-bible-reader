/** "1h30" ou "12 min" — miroir de apps/api/.../format-chapters.util.ts#formatDuration. */
export function formatDurationCompact(seconds: number): string {
  if (seconds <= 0) return "";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}
