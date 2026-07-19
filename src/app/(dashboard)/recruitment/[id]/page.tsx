import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import AddCandidateButton from "@/components/recruitment/AddCandidateButton";

const STAGE_STYLES: Record<string, string> = {
  APPLIED: "bg-gray-100 text-gray-600",
  SCREENING: "bg-blue-100 text-blue-700",
  INTERVIEW: "bg-yellow-100 text-yellow-700",
  OFFER: "bg-purple-100 text-purple-700",
  HIRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function JobPostingDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const posting = await prisma.jobPosting.findFirst({
    where: { id: params.id, organizationId },
    include: {
      department: true,
      applications: {
        include: { candidate: true, _count: { select: { interviews: true } }, offer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!posting) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">{posting.title}</h1>
        {can(role, "recruitment:manage") && <AddCandidateButton jobPostingId={posting.id} />}
      </div>
      <p className="text-sm text-gray-500 mb-6">{posting.department?.name ?? "No department"} · {posting.status}</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-sm text-gray-600 whitespace-pre-wrap">
        {posting.description}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Pipeline</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Interviews</th>
              <th className="px-4 py-3 font-medium">Offer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posting.applications.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/recruitment/applications/${a.id}`} className="text-brand-600 hover:underline font-medium">
                    {a.candidate.firstName} {a.candidate.lastName}
                  </Link>
                  <p className="text-xs text-gray-400">{a.candidate.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[a.stage]}`}>{a.stage}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{a._count.interviews}</td>
                <td className="px-4 py-3 text-gray-500">{a.offer ? a.offer.status : "—"}</td>
              </tr>
            ))}
            {posting.applications.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No candidates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
