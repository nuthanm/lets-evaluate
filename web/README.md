# Let's Evaluate — Web app

The Next.js application for Let's Evaluate. **Full setup, configuration, and deployment docs are in the [root README](../README.md).**

## Quick start

```bash
cd web
cp .env.example .env.local
# Set DATABASE_URL, AUTH_SECRET, OPENAI_API_KEY

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Additional docs

- [Environment template](.env.example) — all configuration variables
- [Cloud database migration](docs/cloud-migration.md) — self-hosted PostgreSQL, S3 resume sync

## Mail templates

All candidate and interviewer emails are **in-app templates** with `{{placeholders}}` — no Resend or third-party mail API. Admins edit templates under **Setup → Mail templates**. Recruiters copy or open prepared messages in their own mail client after screening or booking.
