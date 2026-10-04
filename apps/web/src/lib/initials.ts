/** Two letters for an avatar fallback: first and last name, or the start of the email. */
export function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}
