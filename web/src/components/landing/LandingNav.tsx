import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Logo } from "@/components/Logo";

export function LandingNav() {
  return (
    <nav className="flex items-center justify-between border-b border-[var(--cream-2)] bg-white px-6 py-5 md:px-14">
      <Logo href="/" />
      <div className="flex items-center gap-6 text-sm font-semibold">
        <Link href="/quality" className="hidden text-[var(--ink-soft)] no-underline transition-colors hover:text-[var(--cyan-d)] sm:inline">
          Quality report
        </Link>
        <a
          href="#quality-proof"
          className="hidden text-[var(--ink-soft)] no-underline transition-colors hover:text-[var(--cyan-d)] sm:inline"
        >
          Quality proof
        </a>
        <a
          href="#workflow"
          className="hidden text-[var(--ink-soft)] no-underline transition-colors hover:text-[var(--cyan-d)] sm:inline"
        >
          How it works
        </a>
        <ButtonLink href="/login" variant="ghost" className="px-5 py-2 text-[13px]">
          Sign in
        </ButtonLink>
      </div>
    </nav>
  );
}
