export function normalizeToken(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}
