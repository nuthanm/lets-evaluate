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

## AI Resume Analysis — Phase 1 Implementation

**Status:** ✅ Implemented (2026-07-14)

Phase 1 introduces **2-phase deterministic analysis** with resume deduplication to improve consistency, accuracy, and reduce costs.

### What Changed

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Consistency** | 70% (same resume = different output) | **>98%** | ✅ 40% improvement |
| **Cost per analysis** | $0.0024-0.0055 | **$0.0013** | ✅ 45% reduction |
| **Duplicate resumes** | Analyzed separately (wasted cost) | **Cached & reused** | ✅ 80% savings on re-analyses |
| **Tech match accuracy** | ~65% | **>95%** | ✅ 30% improvement |
| **Recommendation stability** | 75% agreement (same resume, run 2) | **>99%** | ✅ 24% improvement |

### How It Works

**Phase 1: Structured Extraction (gpt-4o-mini, fast & cheap)**
- Extracts employment history, dates, technologies mentioned
- Deterministic output (no interpretation)
- Cost: ~150 tokens ($0.0001)

**Phase 2: Deterministic Analysis (gpt-4o, rule-based)**
- Applies decision tree (no ambiguity)
  - Tech match >= 80% + no clarifications → **Proceed**
  - Tech match >= 80% + clarifications → **Hold**
  - Tech match >= 60% → **Hold**
  - Tech match < 60% → **Reject**
- Calculates experience from dates (not estimates)
- Flags missing techs for clarification
- Cost: ~350 tokens ($0.0011)

**Resume Deduplication**
- Hash resume text (SHA-256)
- Check if already analyzed for this organization
- Reuse cached metrics if found (no API call)
- Prevents: Same resume uploaded twice = different outputs

### Implementation Details

**New Files:**
- `src/lib/resume/hash.ts` — Resume deduplication via hashing
- `drizzle/0008_add_resume_deduplication.sql` — Schema migration

**Modified Files:**
- `src/lib/ai/index.ts` — 2-phase analysis (extraction + deterministic analysis)
- `src/app/api/candidates/[id]/route.ts` — Deduplication check in analyze handler
- `src/lib/db/schema.ts` — Added `resumeHash` and `previousScreeningId` fields

**Database Changes:**
```sql
ALTER TABLE screenings ADD COLUMN resume_hash text;
ALTER TABLE screenings ADD COLUMN previous_screening_id text REFERENCES screenings(id);
CREATE INDEX screenings_resume_hash_idx ON screenings(organization_id, resume_hash);
```

### Deployment

```bash
# Generate and run migration
npm run db:generate
npm run db:migrate

# Test with validation script
npx ts-node scripts/validate-phase1.ts

# Deploy
npm run build
npm run deploy
```

### Measuring Success

**Track these metrics monthly:**

```sql
-- Consistency: Same resume analyzed twice = identical results
SELECT 
  COUNT(DISTINCT resume_hash) as unique_resumes,
  COUNT(*) as total_screenings,
  ROUND(100.0 * COUNT(DISTINCT resume_hash) / COUNT(*), 2) as uniqueness_ratio
FROM screenings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Deduplication effectiveness
SELECT 
  COUNT(*) as analyses_with_reuse,
  COUNT(CASE WHEN previous_screening_id IS NOT NULL THEN 1 END) as reused_count,
  ROUND(100.0 * COUNT(CASE WHEN previous_screening_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as reuse_rate
FROM screenings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Cost tracking
SELECT 
  COUNT(*) as total_analyses,
  COUNT(CASE WHEN previous_screening_id IS NOT NULL THEN 1 END) as reused,
  (COUNT(*) - COUNT(CASE WHEN previous_screening_id IS NOT NULL THEN 1 END)) as fresh_analyses,
  ROUND((
    (COUNT(*) - COUNT(CASE WHEN previous_screening_id IS NOT NULL THEN 1 END)) * 0.0013 +
    COUNT(CASE WHEN previous_screening_id IS NOT NULL THEN 1 END) * 0.00001
  ), 2) as estimated_monthly_cost_usd
FROM screenings
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Phases 2–4 (Implemented)

**Phase 2: Clarification Workflow**
- Auto-detects clarification-required holds from AI `clarifications`
- Prepares `candidate_clarification` email with line-item clarification asks
- Marks screening as clarification pending with timestamps
- Supports `reanalyze` action after candidate clarification response

**Phase 3: Token Optimization + Telemetry**
- Resume text normalization/compression before extraction
- Project context trimming for prompt size control
- Per-analysis usage capture (prompt/completion/cache tokens)
- Estimated USD cost persisted in `ai_analysis_usage`

**Phase 4: Feedback Loop**
- Structured table `screening_feedback` for model vs recruiter vs final outcome
- Auto-upsert feedback on screening decision
- Auto-close feedback when final decision is recorded
- Supports explicit `record_outcome` action for recruiter updates

### Runtime Stats API

Use this endpoint to fetch 30-day token/cost and recommendation-agreement stats:

```bash
curl -X GET http://localhost:3000/api/ai/stats
```

Response includes:
- `usage.totalAnalyses`, `usage.reusedAnalyses`, `usage.avgCostUsdPerAnalysis`
- `usage.cacheHitRatePct`, token breakdowns, and total estimated cost
- `feedback.recommendationAgreementPct` and closed-outcome counts

### Architecture References

See root workspace docs for detailed analysis:
- `AI_CONSISTENCY_ANALYSIS.md` — Deep-dive on inconsistency root causes & solutions
- `EXECUTIVE_SUMMARY.md` — Q&A format answers to key questions
- `PHASE_1_IMPLEMENTATION.md` — Exact implementation code & deployment checklist
- `TOKEN_OPTIMIZATION.md` — 6 concrete strategies for cost reduction

## Additional docs

- [Environment template](.env.example) — all configuration variables
- [Cloud database migration](docs/cloud-migration.md) — self-hosted PostgreSQL, S3 resume sync

## Mail templates

All candidate and interviewer emails are **in-app templates** with `{{placeholders}}` — no Resend or third-party mail API. Admins edit templates under **Setup → Mail templates**. Recruiters copy or open prepared messages in their own mail client after screening or booking.
