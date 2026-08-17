-- CreateEnum
CREATE TYPE "AppraisalCycleStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AppraisalReviewType" AS ENUM ('SELF', 'MANAGER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CONTRACT', 'POLICY', 'IDENTITY', 'CERTIFICATE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KpiStatus" ADD VALUE 'NOT_STARTED';
ALTER TYPE "KpiStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_UPCOMING';
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_LOW_BALANCE';

-- AlterTable
ALTER TABLE "appraisals" ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "reviewType" "AppraisalReviewType";

-- AlterTable
ALTER TABLE "employee_documents" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "type" "DocumentType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "kpis" ADD COLUMN     "parentGoalId" TEXT;

-- CreateTable
CREATE TABLE "appraisal_cycles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "requireSelfReview" BOOLEAN NOT NULL DEFAULT true,
    "status" "AppraisalCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appraisal_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_check_ins" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_task_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offboarding_task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_tasks" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offboarding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appraisal_cycles_organizationId_status_idx" ON "appraisal_cycles"("organizationId", "status");

-- CreateIndex
CREATE INDEX "kpi_check_ins_kpiId_createdAt_idx" ON "kpi_check_ins"("kpiId", "createdAt");

-- CreateIndex
CREATE INDEX "offboarding_task_templates_organizationId_order_idx" ON "offboarding_task_templates"("organizationId", "order");

-- CreateIndex
CREATE INDEX "offboarding_tasks_employeeId_idx" ON "offboarding_tasks"("employeeId");

-- CreateIndex
CREATE INDEX "appraisals_cycleId_reviewType_idx" ON "appraisals"("cycleId", "reviewType");

-- CreateIndex
CREATE INDEX "kpis_parentGoalId_idx" ON "kpis"("parentGoalId");

-- AddForeignKey
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "appraisal_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "kpis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_check_ins" ADD CONSTRAINT "kpi_check_ins_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_task_templates" ADD CONSTRAINT "offboarding_task_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_tasks" ADD CONSTRAINT "offboarding_tasks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
