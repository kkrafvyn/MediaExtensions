export function formatAuditDetails(details: Record<string, unknown>): string {
  if (!details || typeof details !== "object") return "—";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined) continue;
    const label = key.replaceAll("_", " ");
    if (typeof value === "object") {
      parts.push(`${label}: ${JSON.stringify(value)}`);
    } else {
      parts.push(`${label}: ${String(value)}`);
    }
  }
  return parts.length ? parts.join(" · ") : "—";
}
