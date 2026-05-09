import { query } from '../config/db';

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
    ...(req ? { ip: req.ip || req.socket?.remoteAddress, userAgent: req.headers?.['user-agent'] } : {}),
  };
  await query(
    'insert into audit_logs(actor_id, action, entity_type, entity_id, metadata) values($1,$2,$3,$4,$5)',
    [actorId, action, entityType, entityId, JSON.stringify(meta)]
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
