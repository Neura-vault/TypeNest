/** Only allow same-site relative paths after login. Blocks open redirects such as //evil.com or /\\evil.com. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return "/";
  return next;
}
