# CommunityFi: Global Community Finance Infrastructure Platform

**Transform local contribution circles into global community finance coordination.**

A modern, enterprise-grade fintech platform enabling savings circles, contribution pools, event pooling, family finance, creator communities, and cooperative finance across 150+ countries with 50+ currencies and 10+ payment providers.

## Platform Vision

CommunityFi is the global infrastructure for community-driven finance. We empower people to:
- **Save together**: Synchronized contribution circles with flexible payout models
- **Plan together**: Event pooling, vacation savings, rent pooling, emergency support
- **Create together**: Creator communities, accountability groups, investment clubs
- **Trust together**: Immutable transaction ledger, transparent governance, real-time settlement
- **Comply globally**: Region-aware KYC, multi-regulatory framework, AML/CFT by design

## Key Features

### Global Operations (v2.0 Architecture)
- 🌍 **150+ countries** with region-specific configurations
- 💱 **50+ currencies** with real-time forex rates
- 🏦 **10+ payment providers** (Paystack, Flutterwave, Stripe, M-Pesa, Razorpay, Wise, etc.)
- 🔄 **Provider-agnostic** payment abstraction layer
- 📍 **Multi-region deployment** with regional payment processors
- 🔀 **Automatic failover** between payment providers

### Enterprise Security
- 🔐 **JWT + Refresh Tokens** with device/session management
- 📱 **OTP Verification** (Email + SMS)
- 👆 **Biometric Authentication** (Fingerprint/Face)
- 🔑 **Transaction PIN** for high-value operations
- 🚨 **Real-time Fraud Detection** (velocity, duplicates, anomalies, ML-ready)
- 📋 **Audit Logging** (immutable, 7-year retention)

### Financial Architecture
- 📊 **Double-Entry Ledger** (immutable, write-once)
- 💰 **Derived Balances** (calculated from ledger, never manual mutation)
- 🎯 **Wallet Ownership Model** (users, groups, escrow)
- 💾 **Settlement Tracking** with provider reconciliation
- 🔄 **Transaction Deduplication** via idempotency keys
- ⚖️ **Dispute Resolution** with refund automation

### Flexible Group Models
- 🔄 **Savings Circles** (traditional rotation)
- 🎉 **Event Pooling** (vacation, wedding, graduation)
- 👨‍👩‍👧‍👦 **Family Finance** (shared household expenses)
- 🎨 **Creator Communities** (fan support, subscription-style)
- 💼 **Investment Clubs** (collaborative investing)
- 🚨 **Accountability Pools** (goal-based, milestone-based)
- 🏠 **Rent Pooling** (shared housing costs)
- 💳 **Emergency Support** (mutual aid, insurance-like)

**With 4 payout models**: Rotation, Equal Split, Admin Release, Milestone Release, Voting Release

### KYC & Compliance
- 📄 **Document Types**: Passport, SSN, BVN, NIN, Driver's License, National ID
- 🏛️ **3-Tier KYC System**: Basic (email+phone), Intermediate (ID), Full (compliance)
- 🌐 **Regional Providers**: Trulioo, IDology, BVN Registry, national systems
- 🚨 **AML/CFT Rules**: OFAC screening, sanctions checking, transaction monitoring
- 📊 **Compliance Reporting**: SAR/CTR filing, regional regulatory reporting
- 🔍 **Suspicious Activity Flags**: Velocity checks, pattern detection, manual review queues

### Modern Admin Operations
- 📈 **Real-time Dashboards** (transaction volume, settlement status, fraud flags)
- 👥 **User Management** (KYC review, freeze/unfreeze, compliance status)
- 💸 **Payout Approval Workflow** (multi-approver, audit trail)
- 🚨 **Compliance Center** (flag management, AML monitoring, fraud review)
- 🎫 **Support Tickets** (Zendesk integration, SLA tracking)
- 📊 **Advanced Analytics** (cohorts, retention, LTV, custom reports)
- 📱 **Mobile Admin** (on-call operations, critical approval workflows)

### Developer Experience
- 📚 **Type-Safe TypeScript** across backend, frontend, mobile
- 🏗️ **Monorepo with NPM Workspaces** (easy refactoring)
- 📖 **Microservice-Ready Architecture** (extract services without rewrite)
- 🧪 **Comprehensive Testing** (unit, integration, E2E)
- 🚀 **CI/CD Pipelines** (GitHub Actions, automated deployment)
- 📘 **Complete Documentation** (architecture, API, security, compliance)

## Architecture Highlights

### Multi-Region Strategy
```
┌─────────────────────────────────────────┐
│  Global API Gateway + Rate Limiting     │
└──────────────────┬──────────────────────┘
      ┌────────────┼────────────┬──────────┐
   ┌──▼──┐      ┌──▼──┐     ┌──▼──┐   ┌──▼──┐
   │West │      │East │     │ Sth │   │Dias │
   │Afr  │      │Afr  │     │Afr  │   │pora │
   │NG,  │      │ KE, │     │ ZA  │   │GB,  │
   │ GH  │      │ UG  │     │ ZWL │   │ US  │
   └──────┘      └──────┘     └──────┘   └──────┘
     │              │            │           │
   Paystack      M-Pesa       Flutterwave  Stripe
   Flutterwave   Flutterwave   Stripe      Wise
   Stripe        Stripe        Wise
```

### Payment Abstraction
```
Business Logic Layer (provider-agnostic)
          ↓
PaymentProvider Interface (abstract contract)
          ↓
Provider Implementations:
├─ PaystackProvider (Nigeria, Ghana)
├─ FlutterwaveProvider (Multi-region)
├─ StripeProvider (Global)
├─ MpesaProvider (East Africa)
├─ RazorpayProvider (South Asia)
├─ WiseProvider (International)
└─ ProviderSelector (auto-choice + failover)
```

### Ledger Architecture
```
Wallet (owner_type, owner_id, currency)
    ↓
LedgerEntries (IMMUTABLE, write-once)
├─ Contribution: +100 NGN (in)
├─ Payout: -100 NGN (out)
├─ Refund: +50 NGN (in)
└─ Fee: -5 NGN (out)
    ↓
Balance Calculation (derived view)
├─ Available: 100k NGN
├─ Pending: 50k NGN
└─ Locked: 0 NGN
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- npm 10+

### Local Development
```bash
# Clone and install
git clone https://github.com/yemioloyede/ajocircle.git
cd ajocircle-full-mvp
npm install

# Start services
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start development servers (parallel)
npm run dev

# Or individually:
npm run dev:backend   # http://localhost:3000
npm run dev:admin     # http://localhost:3001
npm run dev:mobile    # Expo (Port 8081+)
```

### Configuration
```bash
# Create backend environment file
cp backend/.env.example backend/.env

# Add your payment provider credentials:
PAYSTACK_API_KEY=...
STRIPE_API_KEY=...
# ... other providers

# Configure database
DATABASE_URL=postgres://user:password@localhost:5432/ajocircle
REDIS_URL=redis://localhost:6379
```

## Documentation

Core architecture & design:
- [Global System Architecture](docs/GLOBAL_ARCHITECTURE.md) - Multi-region, multi-currency, multi-provider design
- [Payment Abstraction Layer](docs/PAYMENT_ABSTRACTION.md) - Provider abstraction, failover, reconciliation
- [Database Schema v2.0](docs/DATABASE_SCHEMA_V2.md) - Ledger, wallets, global KYC, compliance
- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) - 6-month phased execution plan
- [Folder Structure](docs/FOLDER_STRUCTURE.md) - Monorepo organization, microservice readiness

Additional guides:
- [Product Blueprint](docs/PRODUCT_BLUEPRINT.md) - Feature roadmap
- [Security Guidelines](docs/SECURITY.md) - Security practices

## Technology Stack

### Backend
- **Runtime**: Node.js 20+ (flexible), Rust/Go (performance critical)
- **Framework**: Express 5+
- **Database**: PostgreSQL 15+ (multi-region, RDS)
- **Cache**: Redis 7+ (ElastiCache)
- **Queues**: Bull/BullMQ, Kafka (phase 2+)
- **Monitoring**: Prometheus + Grafana + DataDog

### Frontend (Admin)
- **Framework**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui
- **State**: TanStack Query + Zustand
- **Charts**: Recharts + Plotly

### Mobile
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation 6+
- **State**: TanStack Query + Zustand
- **Biometric**: react-native-biometrics

### Infrastructure
- **Cloud**: AWS (multi-region)
- **Containerization**: Docker + ECS Fargate
- **API Gateway**: AWS API Gateway + WAF
- **CI/CD**: GitHub Actions → ArgoCD
- **IaC**: Terraform

## Implementation Phases (6 months)

| Phase | Timeline | Focus | Deliverables |
|-------|----------|-------|--------------|
| **1** | Mo 1-2   | Foundation | Multi-region config, payment abstraction, global KYC |
| **2** | Mo 2-3   | Security | JWT, OTP, biometric, transaction PIN, fraud detection |
| **3** | Mo 3-4   | Scalability | Caching, job queues, rate limiting, microservice prep |
| **4** | Mo 4-5   | Operations | Admin dashboard, disputes, support, compliance center |
| **5** | Mo 5-6   | Expansion | Additional providers, languages, regional compliance |
| **6** | Mo 6+    | Optimization | ML fraud detection, microservice extraction, analytics |

## Security & Compliance

### Security Features
- ✅ JWT + Refresh Tokens (with device tracking)
- ✅ OTP Verification (Email/SMS)
- ✅ Biometric Authentication (Fingerprint/Face)
- ✅ Transaction PIN (Argon2 hashed)
- ✅ Rate Limiting (per region, per user)
- ✅ Fraud Detection (real-time velocity, duplicate, anomaly checks)
- ✅ Audit Logging (immutable, 7-year retention)
- ✅ Webhook Signature Verification
- ✅ Encrypted PII (AES-256 at rest)
- ✅ HTTPS/TLS 1.3+ for transit

### Compliance Frameworks
- 🇳🇬 **Nigeria**: CBN, FIRS, BVN/NIN KYC requirements
- 🇬🇭 **Ghana**: BOG, SSNIT/Ghana Card requirements
- 🇰🇪 **Kenya**: CBK, National ID requirements
- 🇬🇧 **UK/EU**: PSD2, SCA, GDPR, FCA compliance
- 🇺🇸 **USA**: FinCEN, OFAC, AML/KYC, CTR/SAR filing
- 🌍 **Global**: AML/CFT rule engine, transaction monitoring, SAR filing

### Data Protection
- ✅ GDPR-ready consent management
- ✅ Data residency (by region)
- ✅ Encrypted backups (daily, multi-region)
- ✅ Point-in-time recovery (PITR)
- ✅ Right-to-deletion framework
- ✅ PII access logging

## Production Deployment

### Pre-Launch Checklist
- [ ] Security audit (internal + external)
- [ ] Compliance review (legal, regulatory)
- [ ] Payment provider onboarding (Paystack, Stripe, Flutterwave)
- [ ] KYC provider integration (Trulioo, IDology)
- [ ] Production database setup (RDS Multi-AZ)
- [ ] SSL/TLS certificates (AWS Certificate Manager)
- [ ] Secrets management (AWS Secrets Manager)
- [ ] Monitoring & alerting (CloudWatch, DataDog)
- [ ] Incident response plan (on-call rotations)
- [ ] Load testing (target: 1k req/sec, 99.99% uptime)
- [ ] Backup & disaster recovery testing
- [ ] Full E2E testing on production-like environment
- [ ] Go/no-go decision with leadership

### Deployment Strategy
- Blue-green deployment (zero-downtime)
- Canary releases (5% → 25% → 100%)
- Health checks + automatic rollback
- Database migrations (backward compatible)
- Staged rollout by region

## Metrics & KPIs (Month 12 Target)

### Usage
- 100k+ active users
- $50M+ monthly transaction volume
- 50%+ monthly retention
- 85%+ KYC completion rate

### Financial
- >99.5% payment success rate
- <24 hour settlement time (90%)
- <1% transaction cost
- $250k+ monthly platform revenue

### Risk
- >95% fraud detection rate
- <0.5% chargeback rate
- <2% compliance flag rate
- 0 data loss events

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
6. CI/CD pipeline runs automatically
7. Maintainers review and merge

## Team

This project is developed by the CommunityFi team with contributions from developers, designers, compliance experts, and fintech specialists across Africa, Europe, and globally.

## Support

- 📧 **Email**: support@ajocircle.com
- 💬 **Community**: [Discord/Slack]
- 📱 **Mobile App**: [Download links]
- 🌐 **Website**: https://ajocircle.com
- 🐛 **Issues**: [GitHub Issues]

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Important Notice

### Security & Legal Disclaimer

This is enterprise-grade fintech infrastructure code, not a standalone banking solution. Before operating with real user funds:

1. **Security Audit**: Engage external security firm (Cure53, Trail of Bits)
2. **Compliance Review**: Consult legal/compliance experts in each operating region
3. **Payment Provider Setup**: Complete Paystack, Stripe, Flutterwave onboarding
4. **KYC Provider**: Set up production integration with Trulioo/IDology
5. **Insurance**: Obtain errors & omissions, cyber liability insurance
6. **Testing**: Full E2E testing, load testing, incident simulation
7. **Infrastructure**: Production-grade AWS setup (Multi-AZ, backups, monitoring)
8. **Operations**: Incident response team, 24/7 on-call rotation
9. **Regulatory**: Register as fintech/money services business in each jurisdiction
10. **Governance**: Board oversight, compliance committee, regular audits

**Never go live without these steps.**

### Risk Acknowledgment

CommunityFi handles real user funds. Failure to properly implement security, compliance, and operations can result in:
- User financial loss
- Regulatory fines & licensing revocation
- Criminal liability
- Reputational damage
- Business failure

Start in a **single country** with **limited volumes** ($0-10k/day) until systems are proven and hardened.

---

**Ready to build global community finance? Let's go! 🚀**

git checkout backup-v1-payout-request-hardening-2026-05-10