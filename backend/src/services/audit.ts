import { query } from '../config/db';

function buildDetails(action: string, entityType: string, entityId: string | null, metadata: any) {
  if (metadata?.details && typeof metadata.details === 'string') return metadata.details;

  const important = Object.entries(metadata || {})
    .filter(([k, v]) => !['ip', 'userAgent', 'method', 'path', 'details'].includes(k) && v !== undefined && v !== null)
    .slice(0, 5)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ');

  const base = `${action} on ${entityType}${entityId ? ` (${entityId})` : ''}`;
  return important ? `${base}: ${important}` : base;
}

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: any = {},
  req?: any
) {
  const meta = {
    ...metadata,
    details: buildDetails(action, entityType, entityId, metadata),
    ...(req ? { ip: req.ip || req.socket?.remoteAddress, userAgent: req.headers?.['user-agent'] } : {}),
    ...(req ? { method: req.method, path: req.originalUrl || req.url } : {}),
  };
  await query(
    'insert into audit_logs(actor_id, action, entity_type, entity_id, metadata) values($1,$2,$3,$4,$5)',
    [actorId, action, entityType, entityId, meta]
  );
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string
) {
  await query(
    'insert into notifications(user_id, type, title, body) values($1,$2,$3,$4)',
    [userId, type, title, body]
  );
}
