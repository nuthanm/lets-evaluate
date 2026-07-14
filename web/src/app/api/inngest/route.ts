import { serve } from "inngest/next";
import { inngest } from "@/lib/infrastructure/jobs/inngest/queue";
import { inngestFunctions } from "@/lib/infrastructure/jobs/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
