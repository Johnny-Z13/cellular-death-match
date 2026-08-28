export interface CrazyGamesEnvironmentInput {
  currentUrl: string;
  referrer?: string;
  ancestorOrigins?: readonly string[];
}

export function isCrazyGamesHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
  return normalized === 'crazygames.com' || normalized.endsWith('.crazygames.com');
}

function hostnameFor(value: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function isCrazyGamesEnvironment(input: CrazyGamesEnvironmentInput): boolean {
  try {
    const current = new URL(input.currentUrl);
    // Gives local and preview QA a deterministic way to exercise the portal UI
    // contract without weakening the real hostname check.
    if (current.searchParams.get('platform') === 'crazygames') return true;
  } catch {
    // The hostname checks below safely ignore malformed candidates.
  }

  return [input.currentUrl, input.referrer ?? '', ...(input.ancestorOrigins ?? [])]
    .map(hostnameFor)
    .some((hostname) => hostname !== null && isCrazyGamesHostname(hostname));
}
