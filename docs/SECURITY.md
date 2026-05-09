# Security Model

- Do not store card data. Paystack handles sensitive card/payment information.
- All balances are derived from immutable ledger entries.
- All Paystack webhooks are signature-verified before updating money records.
- Payouts require admin approval in MVP v1.
- Admin actions are recorded in audit logs.
- Use strong JWT secrets, HTTPS, rate limiting, database backups, and production logging before launch.
- Add BVN/NIN verification, device fingerprinting, fraud rules, and external security audit before public release.
