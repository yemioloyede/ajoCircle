# AjoCircle Full MVP

A secure Nigeria-focused rotational contribution platform with:
- React Native Expo mobile app
- Next.js admin dashboard
- Node/Express backend API
- PostgreSQL ledger database
- Paystack payment + webhook placeholders
- Manual payout approval workflow
- Role-based permissions and audit logs

## Quick start
1. Create PostgreSQL database `ajocircle`.
2. Run `database/schema.sql`.
3. Copy `backend/.env.example` to `backend/.env` and fill values.
4. Run:
```bash
npm run install:all
npm run dev:backend
npm run dev:admin
npm run dev:mobile
```

## Security note
This is a full MVP codebase, not a licensed banking system. Before going live with real user funds, complete a security audit, legal/compliance review, Paystack onboarding, webhook testing, KYC verification, and production infrastructure hardening.
