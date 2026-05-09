import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/db';

const r = Router();
r.use(requireAuth);

r.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const before = req.query.before as string | undefined;

  let rows;
  if (before) {
    rows = await query(
      'select * from notifications where user_id=$1 and created_at < $2 order by created_at desc limit $3',
      [req.user!.id, before, limit]
    );
  } else {
    rows = await query(
      'select * from notifications where user_id=$1 order by created_at desc limit $2',
      [req.user!.id, limit]
    );
  }
  const unreadCount = await query(
    'select count(*) from notifications where user_id=$1 and is_read=false',
    [req.user!.id]
  );
  res.json({
    notifications: rows.rows,
    unreadCount: Number(unreadCount.rows[0].count),
    nextCursor: rows.rows[rows.rows.length - 1]?.created_at ?? null,
  });
});

r.patch('/:id/read', async (req, res) => {
  await query(
    'update notifications set is_read=true where id=$1 and user_id=$2',
    [req.params.id, req.user!.id]
  );
  res.json({ message: 'Marked as read' });
});

r.patch('/read-all', async (req, res) => {
  await query('update notifications set is_read=true where user_id=$1', [req.user!.id]);
  res.json({ message: 'All notifications marked as read' });
});

export default r;
