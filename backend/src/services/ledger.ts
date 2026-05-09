export async function createLedgerEntry(
  client: any,
  data: {
    walletId: string;
    type: string;
    direction: 'CREDIT' | 'DEBIT';
    amountKobo: number;
    reference: string;
    meta?: any;
  }
) {
  const sign = data.direction === 'CREDIT' ? 1 : -1;
  const bal = await client.query(
    `select coalesce(sum(case when direction='CREDIT' then amount_kobo else -amount_kobo end),0) as balance
     from ledger_entries where wallet_id=$1`,
    [data.walletId]
  );
  const newBal = Number(bal.rows[0].balance) + sign * data.amountKobo;
  if (newBal < 0) throw new Error('Insufficient wallet balance');
  const r = await client.query(
    'insert into ledger_entries(wallet_id,type,direction,amount_kobo,balance_after_kobo,reference,metadata) values($1,$2,$3,$4,$5,$6,$7) returning *',
    [data.walletId, data.type, data.direction, data.amountKobo, newBal, data.reference, JSON.stringify(data.meta || {})]
  );
  await client.query('update wallets set balance_kobo=$1, updated_at=now() where id=$2', [newBal, data.walletId]);
  return r.rows[0];
}

/** Create a reversal entry (CREDIT back on failed debit or vice-versa). Reference gets a _REV suffix. */
export async function reverseLedgerEntry(
  client: any,
  data: {
    walletId: string;
    type: string;
    originalDirection: 'CREDIT' | 'DEBIT';
    amountKobo: number;
    originalReference: string;
    meta?: any;
  }
) {
  const reverseDirection = data.originalDirection === 'DEBIT' ? 'CREDIT' : 'DEBIT';
  return createLedgerEntry(client, {
    walletId: data.walletId,
    type: data.type,
    direction: reverseDirection,
    amountKobo: data.amountKobo,
    reference: data.originalReference + '_REV',
    meta: { ...data.meta, reversal: true },
  });
}
