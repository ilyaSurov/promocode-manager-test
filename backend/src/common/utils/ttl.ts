export function parseShortTtlToSeconds(value: string, fallbackSec: number): number {
  const s = value.trim().toLowerCase();
  const m = /^(\d+)(s|m|h|d)$/.exec(s);
  if (!m) {
    return fallbackSec;
  }
  const n = parseInt(m[1], 10);
  const u = m[2];
  const mult =
    u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400;
  return Math.max(1, n * mult);
}
