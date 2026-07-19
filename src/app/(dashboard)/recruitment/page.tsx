import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import NewJobPostingButton from "@/components/recruitment/NewJobPostingButton";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CLOSED: "bg-red-100 text-red-700",
};

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const [postings, departments] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { organizationId },
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Recruitment</h1>
        {can(role, "recruitment:manage") && <NewJobPostingButton departments={departments} />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {postings.map((p) => (
          <Link
            key={p.id}
            href={`/recruitment/${p.id}`}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}>{p.status}</span>
              <span className="text-xs text-gray-400">{p._count.applications} applicant{p._count.applications === 1 ? "" : "s"}</span>
            </div>
            <p className="font-medium text-gray-900">{p.title}</p>
            <p className="text-sm text-gray-500">{p.department?.name ?? "No department"}</p>
          </Link>
        ))}
        {postings.length === 0 && <p className="text-gray-400 text-sm">No job postings yet.</p>}
      </div>
    </div>
  );
}
