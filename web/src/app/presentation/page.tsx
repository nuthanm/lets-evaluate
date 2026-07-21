import type { Metadata } from "next";
import { PresentationDeck } from "@/components/presentation/PresentationDeck";
import { getBrand } from "@/lib/brand";
import "@/styles/presentation.css";

const brand = getBrand();

export const metadata: Metadata = {
  title: `The Brief — ${brand.appTitle}`,
  description: "Kanini Hiring — product brief and pitch deck",
};

export default function PresentationPage() {
  return <PresentationDeck />;
}
