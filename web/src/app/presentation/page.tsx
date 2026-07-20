import type { Metadata } from "next";
import { PresentationDeck } from "@/components/presentation/PresentationDeck";
import { getBrand } from "@/lib/brand";
import "@/styles/presentation.css";

const brand = getBrand();

export const metadata: Metadata = {
  title: `Approval Brief — ${brand.appTitle}`,
  description: "Let's Evaluate vs Zoho Recruit — animated approval presentation",
};

export default function PresentationPage() {
  return <PresentationDeck />;
}
