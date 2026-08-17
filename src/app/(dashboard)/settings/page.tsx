import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getTaxBrackets } from "@/lib/payroll";
import { getOnboardingTemplate } from "@/lib/onboarding";
import { getOffboardingTemplate } from "@/lib/offboarding";
import { emailStatus } from "@/lib/email";
import { storageStatus } from "@/lib/storage";
import LeavePoliciesCard from "@/components/settings/LeavePoliciesCard";
import TaxBracketsCard from "@/components/settings/TaxBracketsCard";
import OnboardingTemplateCard from "@/components/settings/OnboardingTemplateCard";
import OffboardingTemplateCard from "@/components/settings/OffboardingTemplateCard";
import ProvidersCard from "@/components/settings/ProvidersCard";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session!.user as any).role;
  if (!can(role, "settings:manage")) redirect("/dashboard");

  const organizationId = (session!.user as any).organizationId;

  // Ensure defaults exist before their cards read them, so a brand-new org
  // sees the standard schedule/template instead of an empty state.
  await Promise.all([
    getTaxBrackets(organizationId),
    getOnboardingTemplate(organizationId),
    getOffboardingTemplate(organizationId),
  ]);

  const [leavePolicies, taxBrackets, onboardingTemplate, offboardingTemplate] = await Promise.all([
    prisma.leavePolicy.findMany({ where: { organizationId }, orderBy: { type: "asc" } }),
    prisma.taxBracket.findMany({ where: { organizationId }, orderBy: { order: "asc" } }),
    prisma.onboardingTaskTemplate.findMany({ where: { organizationId }, orderBy: { order: "asc" } }),
    prisma.offboardingTaskTemplate.findMany({ where: { organizationId }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Organization-wide configuration for leave, payroll, and integrations."
      />

      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">Leave Policies</TabsTrigger>
          <TabsTrigger value="tax">Tax Brackets</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          <LeavePoliciesCard
            initialPolicies={leavePolicies.map((p) => ({ type: p.type, annualDays: p.annualDays }))}
          />
        </TabsContent>

        <TabsContent value="tax">
          <TaxBracketsCard
            initialBrackets={taxBrackets.map((b) => ({
              upTo: b.upTo === null ? null : b.upTo.toString(),
              rate: b.rate.toString(),
            }))}
          />
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingTemplateCard
            initialItems={onboardingTemplate.map((t) => ({ title: t.title, description: t.description }))}
          />
        </TabsContent>

        <TabsContent value="offboarding">
          <OffboardingTemplateCard
            initialItems={offboardingTemplate.map((t) => ({ title: t.title, description: t.description }))}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <ProvidersCard initialStatus={{ email: emailStatus(), storage: storageStatus() }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
