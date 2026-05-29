/** Strip build metadata (`1.0.0-beta`) and normalize separators. */
export function normalizeVersionLabel(version: string): string {
  const core = String(version).trim().split(/[-+]/)[0]?.trim() ?? '';
  if (!core) return '0.0.0';
  const parts = core.split('.').map((part) => {
    const n = parseInt(part.replace(/[^0-9].*$/, ''), 10);
    return Number.isFinite(n) ? n : 0;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3).join('.');
}

/** Parse `1.2.3` into numeric tuple for comparison (non-numeric parts become 0). */
export function parseSemver(version: string): number[] {
  return normalizeVersionLabel(version)
    .split('.')
    .map((part) => parseInt(part, 10));
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

export function isVersionLessThan(current: string, target: string): boolean {
  return compareSemver(current, target) < 0;
}

/** True when installed version is the same as or newer than the store minimum. */
export function isVersionAtLeast(current: string, target: string): boolean {
  return compareSemver(current, target) >= 0;
}

/** Installed app matches the published latest version (no update dialog). */
export function isOnLatestVersion(current: string, latest: string): boolean {
  return isVersionAtLeast(current, latest);
}
