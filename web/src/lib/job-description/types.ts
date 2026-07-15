import { z } from "zod";

const textSchema = z.string().trim().min(1).max(1200);
const bulletSchema = z.string().trim().min(1).max(220);

export const generateJobDescriptionInputSchema = z.object({
  roleTitle: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  experience: z.string().trim().min(1).max(60),
  domain: z.string().trim().max(160).optional(),
  mustHaveSkills: z.array(z.string().trim().min(1).max(60)).max(16).optional(),
  additionalContext: z.string().trim().max(1200).optional(),
});

export const jobDescriptionSchema = z.object({
  roleTitle: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  experience: z.string().trim().min(1).max(60),
  aboutRole: textSchema,
  whatYoullDo: z.array(bulletSchema).min(6).max(8),
  whatYouBring: z.object({
    summary: textSchema,
    skills: z.array(bulletSchema).min(4).max(12),
    domain: z.string().trim().min(1).max(220),
  }),
  whyJoinKanini: z.array(bulletSchema).min(3).max(6),
  readyToMakeImpact: textSchema,
  generatedAt: z.string().datetime().optional(),
});

export const exportJobDescriptionInputSchema = z.object({
  jobDescription: jobDescriptionSchema,
});

export type GenerateJobDescriptionInput = z.infer<
  typeof generateJobDescriptionInputSchema
>;
export type JobDescription = z.infer<typeof jobDescriptionSchema>;

export function ensureGreatPlaceToWorkLine(lines: string[]): string[] {
  const hasMention = lines.some((line) =>
    /great\s+place\s+to\s+work/i.test(line),
  );
  if (hasMention) return lines;
  return [
    "Recognized as a Great Place to Work, we value trust, inclusion, and growth in every team.",
    ...lines,
  ];
}
