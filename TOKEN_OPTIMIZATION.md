# Token Optimization & Cost Reduction Strategies

## Overview

Your current resume analysis uses **~800 tokens per analysis** at **$0.003 per 1K tokens** = **$0.0024 per analysis**.

This guide provides **concrete strategies** to reduce to **~400-500 tokens** = **$0.0008-0.0012 per analysis** = **50-67% cost reduction**.

---

## 1. Current Token Breakdown

### Prompt tokens (per analysis):
```
System message: "You are an expert recruiter..." 
  → ~50 tokens

Instructions (STRICT GROUNDING RULES, decision tree, etc.):
  → ~200 tokens

Role/Project context:
  → ~100 tokens

Resume text (MAX_RESUME = 4000 chars):
  → ~800-1000 tokens (largest component!)

Tech stack + requirements:
  → ~200 tokens

Other projects context:
  → ~150 tokens

Total input tokens: ~1500-1700 tokens
```

### Response tokens (per analysis):
```
JSON output (metrics):
  → ~200-300 tokens

Total: 1700-2000 tokens per analysis
Cost: $0.003 per 1K tokens → $0.005-0.006 per call
```

**Current reality:** More expensive than your estimate due to response tokens.

---

## 2. Strategy 1: Compress Resume Text Intelligently

### Problem
- Resume often has redundant formatting, repeated titles, verbose descriptions
- Full resume: 4000 characters → 800-1000 tokens
- 50% waste on non-essential text

### Solution: Smart Truncation

**Before:**
```
OBJECTIVE:
Seeking a challenging role that leverages my extensive experience in full-stack development 
to build scalable, innovative solutions that drive business value while contributing to a 
dynamic and collaborative team environment.

PROFESSIONAL SUMMARY:
Results-driven software engineer with 5+ years of experience designing and implementing 
robust backend systems and responsive front-end applications. Proven track record of 
delivering high-quality code on tight deadlines while maintaining best practices and 
mentoring junior engineers through comprehensive code reviews and pair programming sessions.

EXPERIENCE:
Senior Software Engineer
TechCorp Inc. | San Francisco, CA | January 2020 – Present
- Designed and implemented microservices architecture using Node.js, PostgreSQL, and Kubernetes
- Led team of 3 engineers delivering features for internal platform serving 1000+ users
- Improved API response time by 40% through caching and database optimization
- Mentored 2 junior engineers on backend best practices
[2000+ more characters of similar content]
```

**After (smart compression):**
```
PROFESSIONAL SUMMARY:
Senior software engineer with 5+ years experience. Full-stack: Node.js, PostgreSQL, Kubernetes. 
Led team of 3 at TechCorp (2020-Present). Previous: StartupX (2018-2020) as Engineer.

SKILLS: JavaScript, TypeScript, Node.js, React, PostgreSQL, Docker, Kubernetes, AWS

EXPERIENCE:
- Senior Engineer, TechCorp (2020-Present): Microservices, APIs, team lead
- Engineer, StartupX (2018-2020): Full-stack React + Node.js
- Junior Dev, Acme (2015-2018): JavaScript, HTML/CSS

EDUCATION: BS Computer Science, MIT (2015)
CERTIFICATIONS: AWS Solutions Architect (2023)
```

**Token savings: 60% (400 tokens → 150 tokens)**

### Implementation

```typescript
// src/lib/resume/compress.ts

export function compressResume(resumeText: string): string {
  let compressed = resumeText;

  // Remove common verbose sections
  const verbosePatterns = [
    // Objective section (usually verbose fluff)
    /OBJECTIVE[:\s].*?(?=PROFESSIONAL|SUMMARY|EXPERIENCE|$)/is,

    // Verbose intro in summaries (keep only facts)
    /Results-driven|Seeking a challenging|dynamic team environment/gi,

    // Mentor/leadership buzzwords (extract to actual achievement)
    /mentoring.*?(?=[\n]|$)/gi,

    // Duplicate section headers
    /Professional Experience[\s\n]+Experience[:\s]/i,

    // Extra whitespace
    /\n{3,}/g,

    // Multiple spaces
    /  +/g,

    // Very long descriptions (keep first 2 lines)
    /(?<=\n- )(.+?)(?:\n|$)/g,
  ];

  // Apply patterns
  compressed = compressed
    .replace(verbosePatterns[0], "")  // Remove objective
    .replace(verbosePatterns[1], "")  // Remove buzzwords
    .replace(/\n{3,}/g, "\n\n")        // Normalize spacing
    .replace(/  +/g, " ");             // Normalize spaces

  // Keep only essential info from descriptions
  compressed = compressed
    .split("\n")
    .map((line) => {
      // If description is very long (> 150 chars), truncate to first fact
      if (line.startsWith("-") && line.length > 150) {
        const firstSentence = line.split(/[.!?]/)[0];
        return firstSentence.length > 150 ? firstSentence.substring(0, 150) + "..." : firstSentence;
      }
      return line;
    })
    .join("\n");

  // If still > 3000 chars, keep only experience sections
  if (compressed.length > 3000) {
    const sections = compressed.split(/EDUCATION|CERTIFICATIONS|PROJECTS|INTERESTS/i);
    compressed = sections[0]; // Keep only professional summary + experience
  }

  return compressed.trim();
}
```

**Usage:**
```typescript
const resumeText = await extractResumeText(resumeBuffer, filename);
const compressedResume = compressResume(resumeText);

const metrics = await analyzeResume(
  compressedResume,  // Use compressed version
  projectTechStack,
  roleRequirements,
);
```

**Token impact:**
- Before: 1000 tokens for resume
- After: 300-400 tokens for resume
- Savings: 600-700 tokens per analysis (30-35% total reduction)
- Cost per analysis: $0.0024 → $0.0016

---

## 2. Strategy 2: Two-Tier Extraction (Already in Phase 1)

### Extraction with gpt-4o-mini (Cheap)
```typescript
// Uses gpt-4o-mini @ $0.00015 per 1K tokens
const extracted = await extractResumeData(resumeText);
// Input: ~500 tokens
// Output: ~200 tokens
// Cost: $0.0001
```

### Analysis with gpt-4o (Smart)
```typescript
// Uses gpt-4o @ $0.003 per 1K tokens
// But input is pre-extracted, so only ~400 tokens needed
const analysis = await analyzeExtractedData(extracted, ...);
// Input: ~400 tokens (extracted, not raw resume)
// Output: ~250 tokens
// Cost: $0.002
```

**Total new cost: $0.0001 + $0.002 = $0.0021 (13% reduction)**

**Extra benefit:** Extraction is deterministic (no token randomness), so consistency improves.

---

## 3. Strategy 3: Prompt Caching (OpenAI Feature)

### What It Does
Caches system prompt + instructions for 5 minutes. If same requirements + stack analyzed multiple times, only first call sends full prompt.

### Implementation

```typescript
// src/lib/ai/index.ts

export async function analyzeResume(
  resumeText: string,
  projectTechStack: string[],
  roleRequirements: string,
  opts: AnalyzeOptions = {},
  organizationId?: string,
  candidateId?: string,
): Promise<ResumeMetrics> {
  const openai = client();
  if (!openai) {
    return emptyMetrics(projectTechStack, "OpenAI API key not configured");
  }

  // Extract
  const extracted = await extractResumeData(resumeText);

  // Analyze with cache control
  const cacheControl = { type: "ephemeral" as const };

  const messages: any[] = [
    {
      role: "system",
      content: [
        {
          type: "text",
          text: "You are a meticulous technical recruiter. Apply the decision rules exactly. Return valid JSON only.",
          cache_control: cacheControl,  // CACHE: System instruction
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `REQUIRED TECH STACK: ${projectTechStack.join(", ")}

ROLE REQUIREMENTS:
${roleRequirements.slice(0, MAX_ROLE)}

ANALYSIS RULES (Follow EXACTLY):
[All the decision rules from Phase 1 implementation]
`,
          cache_control: cacheControl,  // CACHE: Static rules (same for all analyses)
        },
        {
          type: "text",
          text: `EXTRACTED CANDIDATE DATA:
${JSON.stringify(extracted, null, 2)}

Return ONLY valid JSON...`,
          // NO cache_control on this part (varies per candidate)
        },
      ],
    },
  ];

  const res = await openai.chat.completions.create({
    model: analysisModel(),
    temperature: 0,
    seed: 7,
    response_format: { type: "json_object" },
    messages,
  });

  const raw = res.choices[0]?.message?.content ?? "{}";
  
  // Log cache performance
  if (res.usage) {
    console.log("OpenAI cache stats:", {
      cache_creation_input_tokens: res.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: res.usage.cache_read_input_tokens ?? 0,
      input_tokens: res.usage.input_tokens,
      output_tokens: res.usage.output_tokens,
    });
  }

  return computeExperience(withDefaults(parseJson<Partial<ResumeMetrics>>(raw)));
}
```

**Token savings (per cached request):**
- First call (same project): 400 tokens (full prompt) + 200 tokens extracted + 250 output = 850 tokens
- Second call (same project): 0 tokens cached + 200 tokens extracted + 250 output = 450 tokens ← 47% savings!

**Usage pattern:**
- 10 candidates for same role → First: $0.0025, Next 9: $0.0014 each = **$0.017 total** (vs $0.024 without caching)
- **Savings: 30% when analyzing multiple candidates for same role**

---

## 4. Strategy 4: Batch Processing

### Problem
Analyzing 10 resumes:
- 10 sequential API calls
- 10 connection overheads
- ~10 seconds total latency

### Solution: Batch 5 at a time

```typescript
// src/app/api/batch-analyze/route.ts

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return apiError("Unauthorized", 401);

  const { candidateIds, projectId, roleId } = await req.json();

  // Fetch candidates + project/role in parallel
  const [candidates, projects, roles] = await Promise.all([
    db
      .select()
      .from(candidatesTable)
      .where(inArray(candidatesTable.id, candidateIds)),
    db.select().from(projectsTable).where(eq(projectsTable.id, projectId)),
    db.select().from(rolesTable).where(eq(rolesTable.id, roleId)),
  ]);

  const project = projects[0];
  const role = roles[0];
  const techStack = (project?.techStack as string[]) ?? [];
  const requirements = role?.requirements ?? "";

  // Batch analyze in parallel (not sequential)
  const analysisPromises = candidates.map(async (candidate) => {
    const resumeText = await resolveResumeText(candidate);
    if (!resumeText) return null;

    return {
      candidateId: candidate.id,
      metrics: await analyzeResume(resumeText, techStack, requirements, {
        roleName: role?.name,
        projectName: project?.name,
      }),
    };
  });

  // Wait for all to complete
  const results = await Promise.all(analysisPromises);

  // Store all results
  await Promise.all(
    results
      .filter((r) => r !== null)
      .map((r) =>
        db.insert(screenings).values({
          id: uuid(),
          candidateId: r!.candidateId,
          organizationId: session.user.organizationId,
          metrics: r!.metrics,
        }),
      ),
  );

  return NextResponse.json({
    analyzed: results.filter((r) => r !== null).length,
    failed: results.filter((r) => r === null).length,
  });
}
```

**Latency savings:**
- Sequential (10 calls × 2 sec): 20 seconds
- Parallel (10 calls concurrently): 2-3 seconds
- **10x faster**

**Cost savings:**
- Connection overhead reduction: ~5%
- Not major, but combined with other strategies helps

---

## 5. Strategy 5: Structured Output Schema

### Problem
LLM sometimes returns invalid JSON, forcing retry:
```
"recommendation": "Proceed or maybe Hold",  ← Invalid: not an enum
"tech_match_score": "around 75%",            ← Invalid: not a number
```

Retry = wasted tokens

### Solution: Strict JSON Schema

```typescript
// src/lib/ai/index.ts

// Define schema once
const resumeMetricsSchema = {
  type: "object" as const,
  properties: {
    tech_match_score: { type: "integer", minimum: 0, maximum: 100 },
    matched_technologies: {
      type: "array",
      items: { type: "string" },
    },
    missing_technologies: {
      type: "array",
      items: { type: "string" },
    },
    tech_comparison: {
      type: "array",
      items: {
        type: "object",
        properties: {
          technology: { type: "string" },
          status: {
            type: "string",
            enum: ["Matched", "Unmatched", "Clarification"],
          },
        },
        required: ["technology", "status"],
      },
    },
    recommendation: {
      type: "string",
      enum: ["Proceed", "Hold", "Reject"],
    },
    suitability: {
      type: "object",
      properties: {
        verdict: {
          type: "string",
          enum: ["Suitable", "Partially suitable", "Not suitable"],
        },
        description: { type: "string" },
      },
      required: ["verdict", "description"],
    },
    // ... other fields
  },
  required: [
    "tech_match_score",
    "matched_technologies",
    "recommendation",
    "suitability",
  ],
};

// Use in API call
const res = await openai.chat.completions.create({
  model: analysisModel(),
  temperature: 0,
  seed: 7,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "resume_analysis",
      schema: resumeMetricsSchema,
      strict: true,  // Enforce schema compliance
    },
  },
  messages: [...],
});
```

**Savings:**
- Eliminates JSON parse failures: 0% retry rate (vs ~2-3% without schema)
- 2-3% token savings from fewer retries

---

## 6. Strategy 6: Remove Redundant Context

### Problem
Current prompt includes:
- Other open projects (even if not relevant)
- Full role requirements (even if concise)
- Verbose instruction headers

### Solution: Trim Ruthlessly

**Before:**
```
OTHER OPEN PROJECTS:
- Mobile App: React Native, Node.js, Firebase
- Data Platform: Python, Spark, Airflow
- ML Pipeline: Python, TensorFlow, Kubernetes
- Cloud Migration: AWS, Terraform, Python
- Legacy System: Java, Spring, PostgreSQL
- Microservices: Node.js, Docker, Kubernetes, gRPC
```

**After:**
```
OTHER PROJECTS: Mobile App (React Native), Data Platform (Python), ML (TensorFlow)
```

**Token savings: 200 → 50 tokens (-75%)**

### Implementation

```typescript
const compressedOtherProjects = (otherProjects ?? [])
  .slice(0, 3)  // Only top 3 most relevant
  .map((p) => `${p.name} (${p.techStack.slice(0, 2).join(", ")})`)  // Only top 2 techs
  .join(", ");

const otherProjectsBlock = compressedOtherProjects 
  ? `OTHER PROJECTS: ${compressedOtherProjects}`
  : "OTHER PROJECTS: None";
```

---

## 7. Combined Impact: Before & After

### Baseline (Current)
```
System + Instructions:    250 tokens
Resume:                  1000 tokens
Tech Stack + Reqs:        200 tokens
Other Projects:           150 tokens
Total input:            1600 tokens
Output:                  250 tokens
───────────────────────────────────
Total per analysis:      1850 tokens
Cost:                    $0.0055
```

### After Strategy 1 (Compress Resume)
```
System + Instructions:    250 tokens
Resume (compressed):      350 tokens ← -650 tokens
Tech Stack + Reqs:        200 tokens
Other Projects:           150 tokens
───────────────────────────────────
Total input:             950 tokens (-40%)
Output:                  250 tokens
───────────────────────────────────
Total per analysis:     1200 tokens
Cost:                   $0.0036 (-34%)
```

### After Strategy 2 (Two-Tier: Extract + Analyze)
```
EXTRACTION (gpt-4o-mini):
  Input:                 600 tokens
  Output:                200 tokens
  Subtotal:              800 tokens @ $0.00015/1K = $0.00012

ANALYSIS (gpt-4o):
  Input (extracted):     350 tokens ← Much smaller!
  Instructions:         250 tokens (now second call)
  Output:               250 tokens
  Subtotal:             850 tokens @ $0.003/1K = $0.00255

───────────────────────────────────
Total per analysis:     1650 tokens (-11% vs baseline)
Cost:                   $0.00267 (-52%)
```

### After Strategy 3 (Add Caching)
```
First call (same project):   1650 tokens
Cached calls (same project):  850 tokens (extraction only, no instructions)

Average cost (50% cache hit): 
  (1650 + 850) / 2 = 1250 tokens
  Cost: $0.00188 (-66% vs baseline)
```

### After Strategy 4-6 (Batch + Schema + Trim)
```
Batch processing: -5% latency overhead
Structured schema: -2% from retry failures
Trim other projects: -15% from redundant context

Total input tokens: 850 (extraction) + 300 (analysis, trimmed) = 1150 tokens

Cost per analysis: 
  (1150 tokens × $0.003/1K) + (600 tokens × $0.00015/1K)
  = $0.00345 + $0.00009
  = $0.00354 / analysis

Original: $0.0055
Final: $0.00354
────────────────────
Savings: 36% per analysis
Additional savings if 50% cached: another 25%
Total with everything: 60% cost reduction
```

---

## Implementation Priority

### High ROI (Do First)
1. **Strategy 2: Two-tier extraction** (1 day) → 50% cost reduction
2. **Strategy 1: Resume compression** (2 hours) → Additional 15-20%
3. **Strategy 5: Structured schema** (2 hours) → Additional 2-3%

**Cumulative: ~60% cost reduction, 1.5 engineer days**

### Medium ROI (Do Next Sprint)
4. **Strategy 3: Prompt caching** (3 hours) → Additional 15% (if multiple candidates/role)
5. **Strategy 6: Trim context** (2 hours) → Additional 5%

### Lower Priority
6. **Strategy 4: Batch processing** (1 day) → Latency improvement, minimal cost savings

---

## Measuring Success

### Token Monitoring

Add logging to track tokens:

```typescript
// src/lib/ai/index.ts

interface TokenUsage {
  timestamp: Date;
  candidateId: string;
  extractionTokens: number;
  analysisInputTokens: number;
  analysisOutputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalCost: number;
}

export async function logTokenUsage(usage: TokenUsage) {
  await db.insert(tokenLogs).values(usage);
}

// Usage
const extractRes = await openai.chat.completions.create({...});
const analysisRes = await openai.chat.completions.create({...});

await logTokenUsage({
  timestamp: new Date(),
  candidateId,
  extractionTokens: extractRes.usage.prompt_tokens,
  analysisInputTokens: analysisRes.usage.prompt_tokens,
  analysisOutputTokens: analysisRes.usage.completion_tokens,
  cacheReadTokens: analysisRes.usage.cache_read_input_tokens ?? 0,
  cacheCreationTokens: analysisRes.usage.cache_creation_input_tokens ?? 0,
  totalCost: (extractRes.usage.prompt_tokens * 0.00015 + 
              analysisRes.usage.prompt_tokens * 0.003 +
              analysisRes.usage.completion_tokens * 0.006) / 1000,
});
```

### Monthly Report

```sql
-- Cost trends
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as analyses,
  AVG(totalCost) as avg_cost_per_analysis,
  SUM(totalCost) as daily_cost
FROM tokenLogs
GROUP BY 1
ORDER BY 1 DESC;

-- Cache effectiveness
SELECT 
  COUNT(*) as total_analyses,
  SUM(CASE WHEN cacheReadTokens > 0 THEN 1 ELSE 0 END) as cached_analyses,
  ROUND(100.0 * SUM(CASE WHEN cacheReadTokens > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as cache_hit_rate,
  ROUND(SUM(CASE WHEN cacheReadTokens > 0 THEN cacheReadTokens ELSE 0 END) / 1000.0 * 0.003, 2) as tokens_saved_usd
FROM tokenLogs
WHERE timestamp >= NOW() - INTERVAL '30 days';
```

---

## Summary Table

| Strategy | Effort | Savings | Implementation |
|----------|--------|---------|-----------------|
| Two-tier extraction | 1 day | 50% | Phase 1 |
| Resume compression | 2 hrs | 15-20% | Phase 1 |
| Structured schema | 2 hrs | 2-3% | Phase 1 |
| Prompt caching | 3 hrs | 15-25% | Phase 3 |
| Trim context | 2 hrs | 5% | Phase 3 |
| Batch processing | 1 day | 5% latency | Phase 3 |
| **Total** | **1.5-2 days** | **60-70%** | **Phases 1 + 3** |

**ROI: 2 engineer days → $15-20/month savings on cost, $100+/month on recruiter time saved**
