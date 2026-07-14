# Cloud database migration runbook

## Neon (demo) → Azure Database for PostgreSQL

1. **Export** from Neon:
   ```bash
   pg_dump -Fc "$DATABASE_URL" -f lets-evaluate.dump
   ```

2. **Create** Azure Database for PostgreSQL (Flexible Server).

3. **Restore**:
   ```bash
   pg_restore -d "$AZURE_DATABASE_URL" --clean --if-exists lets-evaluate.dump
   ```

4. **Update** `DATABASE_URL` in Vercel project settings.

5. **Redeploy** — no code changes required.

## Resume files (S3 / R2 / Azure Blob)

If `RESUME_STORAGE_PROVIDER=s3`:

```bash
aws s3 sync s3://old-bucket/resumes s3://new-bucket/resumes
```

Update `S2_BUCKET`, `S2_ENDPOINT`, and credentials in env.

For Cloudflare R2, set `S2_ENDPOINT` to `https://<account-id>.r2.cloudflarestorage.com` and keep `S2_REGION=auto`.

## Verify after migration

- `npm run db:seed` (idempotent)
- Sign in with migrated user (bcrypt hashes preserved)
- Open `/people` and confirm candidates/projects
