import { requireRole } from "@/lib/auth/rbac";
import { BulkJobDashboard } from "./BulkJobDashboard";

type Props = { params: Promise<{ id: string }> };

export default async function BulkJobPage({ params }: Props) {
  await requireRole(["admin", "ta"]);
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BulkJobDashboard jobId={id} />
    </div>
  );
}
