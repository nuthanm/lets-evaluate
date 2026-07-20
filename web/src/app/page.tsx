import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { DossierPreview } from "@/components/landing/DossierPreview";
import { LandingNav } from "@/components/landing/LandingNav";
import { getBrand } from "@/lib/brand";

const workflow = [
  {
    num: "01",
    title: "Configure context",
    desc: "Projects, roles, and question banks — set up once.",
  },
  {
    num: "02",
    title: "Upload evidence",
    desc: "Resume parsed and matched to your tech stack.",
  },
  {
    num: "03",
    title: "AI analysis",
    desc: "Strengths, gaps, and tailored interview questions.",
  },
  {
    num: "04",
    title: "Record verdict",
    desc: "Selected, hold, or rejected — archived with PDF.",
  },
];

export default async function HomePage() {
  const brand = getBrand();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <div className="bg-[var(--navy)] py-2.5 text-center text-[11px] font-semibold tracking-wide text-white/80">
        AI assists · <span className="text-[var(--cyan)]">humans decide</span> · structured
        hiring evaluations
      </div>

      <LandingNav />

      <section className="grid min-h-[calc(100vh-120px)] md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center border-b border-[var(--cream-2)] bg-white px-6 py-14 md:border-b-0 md:border-r md:px-14 md:py-16">
          <div className="land-fade-up mb-7 flex items-center gap-2.5">
            <span className="h-0.5 w-8 bg-[var(--cyan)]" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Talent acquisition platform
            </span>
          </div>

          <h1 className="font-serif land-fade-up land-fade-up-delay-1 text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.05] tracking-tight">
            Every candidate deserves
            <em className="mt-1 block text-[var(--cyan-d)] not-italic">
              a proper verdict.
            </em>
          </h1>

          <p className="land-fade-up land-fade-up-delay-2 mt-6 max-w-md text-[17px] leading-relaxed text-[var(--ink-soft)]">
            Open a case file. Upload the resume. Let AI analyse the evidence. Generate
            interview questions. Record your decision. Four steps — no spreadsheets, no
            guesswork.
          </p>

          <div className="land-fade-up land-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/register">Open a case file →</ButtonLink>
            <ButtonLink href="#workflow" variant="ghost">
              See the workflow
            </ButtonLink>
          </div>

          <div className="land-fade-up land-fade-up-delay-3 mt-12 grid grid-cols-3 gap-4 border-t border-[var(--cream-2)] pt-7">
            {[
              ["4", "Guided steps"],
              ["~12m", "Per evaluation"],
              ["100%", "Audit trail"],
            ].map(([val, label]) => (
              <div key={label}>
                <strong className="font-serif block text-[2rem] leading-none">{val}</strong>
                <span className="mt-1 block text-xs font-medium text-[var(--ink-faint)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--cyan-soft)] to-[var(--cream-2)] px-6 py-14 md:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(26,43,60,.04) 20px, rgba(26,43,60,.04) 21px)",
            }}
            aria-hidden
          />
          <div className="land-fade-up land-fade-up-delay-2 relative z-10 w-full">
            <DossierPreview />
          </div>
        </div>
      </section>
      <section id="workflow" className="border-t border-[var(--cream-2)] bg-[var(--navy)] text-white">
        <div className="grid md:grid-cols-4">
          {workflow.map((item) => (
            <article
              key={item.num}
              className="border-b border-white/10 px-7 py-8 transition-colors last:border-b-0 hover:bg-white/[0.03] md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="font-serif text-[2.5rem] leading-none text-[var(--cyan)]">
                {item.num}
              </div>
              <h3 className="mt-2 text-sm font-bold">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">{item.desc}</p>
            </article>
          ))}
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/40">
          Built for{" "}
          <span className="font-bold text-[var(--cyan)]">{brand.orgName}</span> teams ·{" "}
          {brand.tagline}
        </p>
      </section>

      <footer className="border-t border-[var(--cream-2)] bg-white py-5 text-center text-xs text-[var(--ink-faint)]">
        <Link href="/login" className="text-[var(--ink-soft)] hover:text-[var(--cyan-d)]">
          Sign in
        </Link>
        {" · "}
        {brand.copyright}
      </footer>
    </main>
  );
}
