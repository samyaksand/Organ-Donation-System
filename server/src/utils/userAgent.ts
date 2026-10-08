/**
 * Coarse, privacy-safe User-Agent parsing for the Active Sessions UI. Deliberately not a
 * fingerprinting library: it extracts only a browser name and an OS name (e.g. "Chrome",
 * "Windows"), never a version string, device model, or anything that could re-identify a
 * specific device beyond "which browser, which OS" - good enough to tell two sessions apart in
 * a list, nothing more. No new dependency: a small set of ordered regex checks is all this needs.
 */
export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
}

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Chrome\//, 'Chrome'],
  [/CriOS\//, 'Chrome'],
  [/FxiOS\//, 'Firefox'],
  [/Firefox\//, 'Firefox'],
  [/Safari\//, 'Safari'],
];

const OS_PATTERNS: Array<[RegExp, string]> = [
  [/Windows/, 'Windows'],
  [/Mac OS X/, 'macOS'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Linux/, 'Linux'],
];

export function parseUserAgent(userAgent: string | undefined | null): ParsedUserAgent {
  if (!userAgent) return { browser: null, os: null };
  const browser = BROWSER_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? null;
  const os = OS_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? null;
  return { browser, os };
}

export function formatDeviceLabel(parsed: ParsedUserAgent): string {
  if (parsed.browser && parsed.os) return `${parsed.browser} · ${parsed.os}`;
  return parsed.browser ?? parsed.os ?? 'Unknown device';
}
