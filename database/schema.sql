create extension if not exists "uuid-ossp";
create table if not exists users(
 id uuid primary key default uuid_generate_v4(), full_name text not null, email text unique not null, phone text unique not null, password_hash text not null,
 role text not null default 'MEMBER' check(role in ('MEMBER','GROUP_ADMIN','COMPLIANCE_ADMIN','SUPER_ADMIN')),
 kyc_status text not null default 'BASIC' check(kyc_status in ('BASIC','PENDING','VERIFIED','REJECTED')),
 status text not null default 'ACTIVE' check(status in ('ACTIVE','FROZEN')),
 bank_name text, bank_code text, account_number text, account_name text, transfer_recipient_code text,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists wallets(id uuid primary key default uuid_generate_v4(), owner_type text not null check(owner_type in ('USER','GROUP','PLATFORM')), owner_id uuid not null, currency text default 'NGN', balance_kobo bigint not null default 0, status text default 'ACTIVE', created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists savings_groups(id uuid primary key default uuid_generate_v4(), name text not null, frequency text not null check(frequency in ('DAILY','WEEKLY','MONTHLY')), contribution_amount_kobo bigint not null, max_members int not null, start_date date not null, created_by uuid references users(id), invite_code text unique not null, wallet_id uuid references wallets(id), status text not null default 'ACTIVE' check(status in ('ACTIVE','FROZEN','CLOSED')), created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists group_members(id uuid primary key default uuid_generate_v4(), group_id uuid references savings_groups(id) on delete cascade, user_id uuid references users(id), role text not null default 'MEMBER', payout_position int not null, status text not null default 'ACTIVE', joined_at timestamptz default now(), unique(group_id,user_id));
create table if not exists contributions(id uuid primary key default uuid_generate_v4(), group_id uuid references savings_groups(id), user_id uuid references users(id), amount_kobo bigint not null, status text not null check(status in ('PENDING','SUCCESS','FAILED','REVERSED')), payment_reference text unique not null, provider_payload jsonb, paid_at timestamptz, created_at timestamptz default now());
create table if not exists ledger_entries(id uuid primary key default uuid_generate_v4(), wallet_id uuid references wallets(id), type text not null, direction text not null check(direction in ('CREDIT','DEBIT')), amount_kobo bigint not null, balance_after_kobo bigint not null, reference text not null unique, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists payouts(id uuid primary key default uuid_generate_v4(), group_id uuid references savings_groups(id), recipient_user_id uuid references users(id), amount_kobo bigint not null, status text not null check(status in ('PENDING_REVIEW','APPROVED','PROCESSING','PAID','FAILED','CANCELLED')), requested_by uuid references users(id), approved_by uuid references users(id), approved_at timestamptz, transfer_reference text unique, provider_payload jsonb, created_at timestamptz default now());
create table if not exists audit_logs(id uuid primary key default uuid_generate_v4(), actor_id uuid, action text not null, entity_type text not null, entity_id text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create index if not exists idx_contributions_group on contributions(group_id);
create index if not exists idx_contributions_user on contributions(user_id);
create index if not exists idx_ledger_wallet on ledger_entries(wallet_id);
create index if not exists idx_audit_created on audit_logs(created_at desc);
create index if not exists idx_payouts_recipient on payouts(recipient_user_id);
create index if not exists idx_payouts_group on payouts(group_id);

-- Migration: add transfer_code to payouts
alter table payouts add column if not exists transfer_code text unique;

-- Migration: add status to users (for freeze/unfreeze)
alter table users add column if not exists status text not null default 'ACTIVE' check(status in ('ACTIVE','FROZEN'));

-- KYC submissions table
create table if not exists kyc_submissions(
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  bvn_encrypted text,
  bvn_iv text,
  nin_encrypted text,
  nin_iv text,
  status text not null default 'PENDING' check(status in ('PENDING','VERIFIED','REJECTED')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Bank accounts table
create table if not exists bank_accounts(
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  bank_name text not null,
  bank_code text not null,
  account_number_encrypted text not null,
  account_number_iv text not null,
  account_name text not null,
  paystack_recipient_code text,
  is_primary boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_bank_accounts_user on bank_accounts(user_id);

-- Notifications table
create table if not exists notifications(
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);
