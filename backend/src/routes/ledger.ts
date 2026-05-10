import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/db';

const r = Router();
r.use(requireAuth);

// GET /api/ledger/me — user's wallet balance + paginated ledger entries
r.get('/me', async (req, res) => {
  // Find the user's personal wallet (created via groups membership or contributions)
  // Balance = sum of all user-scoped ledger entries via their wallets
  const wallets = await query(
    `select distinct w.id from wallets w
     join group_members m on m.group_id = w.group_id
     where m.user_id = $1`,
    [req.user!.id]
  );

  const walletIds = wallets.rows.map((r: any) => r.id);

  if (walletIds.length === 0) {
    return res.json({ balanceKobo: 0, entries: [], nextCursor: null });
  }

  const placeholders = walletIds.map((_: any, i: number) => `$${i + 1}`).join(',');

  // Cursor-based pagination
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const before = req.query.before as string | undefined;

  const entries = await query(
    `select le.*, sg.name as group_name
     from ledger_entries le
     join wallets w on w.id = le.wallet_id
     left join savings_groups sg on sg.id = w.group_id
     where le.wallet_id in (${placeholders})
     ${before ? `and le.created_at < $${walletIds.length + 1}` : ''}
     order by le.created_at desc
     limit ${limit + 1}`,
    before ? [...walletIds, before] : walletIds
  );

  const rows = entries.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].created_at : null;

  // Compute running balance (all entries, not paginated)
  const bal = await query(
    `select
       coalesce(sum(case when direction='CREDIT' then amount_kobo else -amount_kobo end), 0) as balance
     from ledger_entries where wallet_id in (${placeholders})`,
    walletIds
  );

  res.json({
    balanceKobo: Number(bal.rows[0].balance),
    entries: page,
    nextCursor,
  });
});

export default r;
