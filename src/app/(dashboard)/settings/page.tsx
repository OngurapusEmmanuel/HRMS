import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getTaxBrackets } from "@/lib/payroll";
import { getOnboardingTemplate } from "@/lib/onboarding";
import { emailStatus } from "@/lib/email";
import { storageStatus } from "@/lib/storage";
import LeavePoliciesCard from "@/components/settings/LeavePoliciesCard";
import TaxBracketsCard from "@/components/settings/TaxBracketsCard";
import OnboardingTemplateCard from "@/components/settings/OnboardingTemplateCard";
import ProvidersCard from "@/components/settings/ProvidersCard";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session!.user as any).role;
  if (!can(role, "settings:manage")) redirect("/dashboard");

  const organizationId = (session!.user as any).organizationId;

  // Ensure defaults exist before their cards read them, so a brand-new org
  // sees the standard schedule/template instead of an empty state.
  await Promise.all([getTaxBrackets(organizationId), getOnboardingTemplate(organizationId)]);

  const [leavePolicies, taxBrackets, onboardingTemplate] = await Promise.all([
    prisma.leavePolicy.findMany({ where: { organizationId }, orderBy: { type: "asc" } }),
    prisma.taxBracket.findMany({ where: { organizationId }, orderBy: { order: "asc" } }),
    prisma.onboardingTaskTemplate.findMany({ where: { organizationId }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settings</h1>
        <p className="text-sm text-gray-500">Organization-wide configuration for leave, payroll, and integrations.</p>
      </div>

      <LeavePoliciesCard
        initialPolicies={leavePolicies.map((p) => ({ type: p.type, annualDays: p.annualDays }))}
      />

      <TaxBracketsCard
        initialBrackets={taxBrackets.map((b) => ({
          upTo: b.upTo === null ? null : b.upTo.toString(),
          rate: b.rate.toString(),
        }))}
      />

      <OnboardingTemplateCard
        initialItems={onboardingTemplate.map((t) => ({ title: t.title, description: t.description }))}
      />

      <ProvidersCard initialStatus={{ email: emailStatus(), storage: storageStatus() }} />
    </div>
  );
}
