import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";

export async function recordAuditLog(entry: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details ?? {},
  });
}
