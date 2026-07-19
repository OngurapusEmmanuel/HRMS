import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ONBOARDING_TASKS } from "../src/lib/onboarding";
import { computeOverallRating, generateContractSummary } from "../src/lib/appraisal";

const prisma = new PrismaClient();

// Relative to whenever the seed actually runs, not a fixed calendar date —
// keeps the workforce trend charts (headcount/turnover) populated with
// recent-looking data no matter when someone runs `prisma db seed`.
function monthsAgo(n: number, day = 15): Date {
  const d = new Date();
  d.setDate(1); // avoid month-length rollover surprises when subtracting months
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const org = await prisma.organization.create({
    data: { name: "Acme Inc", slug: "acme" },
  });

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const adminUser = await prisma.user.create({
    data: { email: "admin@acme.test", passwordHash, role: "ADMIN", organizationId: org.id },
  });

  const engineering = await prisma.department.create({
    data: { name: "Engineering", organizationId: org.id },
  });
  const marketing = await prisma.department.create({
    data: { name: "Marketing", organizationId: org.id },
  });

  const hrUser = await prisma.user.create({
    data: { email: "hr@acme.test", passwordHash, role: "HR", organizationId: org.id },
  });

  // Manager: heads Engineering only. Should NOT be able to approve/see leave
  // requests from the Marketing employee below.
  const managerUser = await prisma.user.create({
    data: { email: "manager@acme.test", passwordHash, role: "MANAGER", organizationId: org.id },
  });
  const manager = await prisma.employee.create({
    data: {
      employeeCode: "EMP-0001",
      userId: managerUser.id,
      organizationId: org.id,
      firstName: "Sam",
      lastName: "Rivera",
      jobTitle: "Engineering Manager",
      departmentId: engineering.id,
      hireDate: new Date("2022-03-01"),
      baseSalary: 150000,
    },
  });
  await prisma.department.update({ where: { id: engineering.id }, data: { managerId: manager.id } });

  const empUser = await prisma.user.create({
    data: { email: "jane@acme.test", passwordHash, role: "EMPLOYEE", organizationId: org.id },
  });
  const jane = await prisma.employee.create({
    data: {
      employeeCode: "EMP-0002",
      userId: empUser.id,
      organizationId: org.id,
      firstName: "Jane",
      lastName: "Doe",
      jobTitle: "Software Engineer",
      departmentId: engineering.id,
      reportsToId: manager.id,
      hireDate: new Date("2024-01-15"),
      baseSalary: 120000,
    },
  });
  await prisma.onboardingTask.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((t, i) => ({
      employeeId: jane.id,
      title: t.title,
      description: t.description,
      order: i,
      // Demo data: first two steps already done, to show a checklist mid-progress.
      completed: i < 2,
      completedAt: i < 2 ? new Date() : null,
    })),
  });

  // Two periodic appraisals showing an improving trend, so the checklist and
  // performance history both have realistic demo content.
  const janeScoresQ1 = { "Communication": 3, "Technical Skills": 3, "Teamwork": 4, "Punctuality": 4, "Initiative": 3 };
  const janeScoresQ2 = { "Communication": 4, "Technical Skills": 4, "Teamwork": 4, "Punctuality": 5, "Initiative": 4 };
  await prisma.appraisal.create({
    data: {
      employeeId: jane.id,
      reviewerId: manager.id,
      organizationId: org.id,
      periodStart: new Date("2024-01-15"),
      periodEnd: new Date("2024-04-15"),
      scores: janeScoresQ1,
      overallRating: computeOverallRating(janeScoresQ1),
      strengths: "Reliable teammate, picks up new codebase areas quickly.",
      areasForImprovement: "Could speak up more in design discussions.",
      goals: "Lead a small feature end-to-end next quarter.",
    },
  });
  await prisma.appraisal.create({
    data: {
      employeeId: jane.id,
      reviewerId: manager.id,
      organizationId: org.id,
      periodStart: new Date("2024-04-16"),
      periodEnd: new Date("2024-07-16"),
      scores: janeScoresQ2,
      overallRating: computeOverallRating(janeScoresQ2),
      strengths: "Led the reporting dashboard feature independently; much more vocal in reviews.",
      areasForImprovement: "Documentation could be more thorough.",
      goals: "Mentor the next new hire on the team.",
    },
  });

  const marketingUser = await prisma.user.create({
    data: { email: "alex@acme.test", passwordHash, role: "EMPLOYEE", organizationId: org.id },
  });
  const alex = await prisma.employee.create({
    data: {
      employeeCode: "EMP-0003",
      userId: marketingUser.id,
      organizationId: org.id,
      firstName: "Alex",
      lastName: "Kim",
      jobTitle: "Marketing Specialist",
      departmentId: marketing.id,
      hireDate: new Date("2023-06-01"),
      baseSalary: 95000,
    },
  });
  await prisma.onboardingTask.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((t, i) => ({
      employeeId: alex.id,
      title: t.title,
      description: t.description,
      order: i,
    })),
  });

  await prisma.leavePolicy.createMany({
    data: [
      { organizationId: org.id, type: "ANNUAL", annualDays: 21 },
      { organizationId: org.id, type: "SICK", annualDays: 10 },
    ],
  });

  // A completed fixed-term contract, fully appraised and terminated, to
  // demonstrate the end-to-end appraisal → contract summary flow without
  // needing to manually trigger it after seeding.
  const priyaUser = await prisma.user.create({
    data: { email: "priya@acme.test", passwordHash, role: "EMPLOYEE", organizationId: org.id },
  });
  const priya = await prisma.employee.create({
    data: {
      employeeCode: "EMP-0004",
      userId: priyaUser.id,
      organizationId: org.id,
      firstName: "Priya",
      lastName: "Sharma",
      jobTitle: "Marketing Contractor",
      departmentId: marketing.id,
      hireDate: new Date("2023-01-01"),
      contractEndDate: new Date("2023-12-31"),
      terminationDate: new Date("2023-12-31"),
      status: "TERMINATED",
      baseSalary: 80000,
    },
  });
  const priyaScoresQ1 = { "Communication": 4, "Technical Skills": 3, "Teamwork": 4, "Punctuality": 3, "Initiative": 3 };
  const priyaScoresQ2 = { "Communication": 4, "Technical Skills": 3, "Teamwork": 4, "Punctuality": 3, "Initiative": 4 };
  await prisma.appraisal.create({
    data: {
      employeeId: priya.id,
      reviewerId: manager.id, // demo data — cross-department reviewer is fine here
      organizationId: org.id,
      periodStart: new Date("2023-01-01"),
      periodEnd: new Date("2023-06-30"),
      scores: priyaScoresQ1,
      overallRating: computeOverallRating(priyaScoresQ1),
      strengths: "Strong written communication, good campaign copy.",
      areasForImprovement: "Ramp-up time on the analytics tooling was slow.",
    },
  });
  await prisma.appraisal.create({
    data: {
      employeeId: priya.id,
      reviewerId: manager.id,
      organizationId: org.id,
      periodStart: new Date("2023-07-01"),
      periodEnd: new Date("2023-12-31"),
      scores: priyaScoresQ2,
      overallRating: computeOverallRating(priyaScoresQ2),
      strengths: "Ran the year-end campaign with minimal oversight.",
      areasForImprovement: "Could delegate more instead of doing everything solo.",
    },
  });
  await generateContractSummary(priya.id, org.id, adminUser.id);

  // ---------- Workforce trend history (for Reports & Analytics) ----------
  // A few more employees hired/terminated at different points over the past
  // year so the headcount and turnover charts show real movement instead of
  // a flat line.
  const priorLeaverUser = await prisma.user.create({
    data: { email: "morgan@acme.test", passwordHash, role: "EMPLOYEE", organizationId: org.id },
  });
  await prisma.employee.create({
    data: {
      employeeCode: "EMP-0005",
      userId: priorLeaverUser.id,
      organizationId: org.id,
      firstName: "Morgan",
      lastName: "Lee",
      jobTitle: "Sales Associate",
      departmentId: marketing.id,
      hireDate: monthsAgo(10),
      terminationDate: monthsAgo(4),
      status: "TERMINATED",
      baseSalary: 70000,
    },
  });
  const recentLeaverUser = await prisma.user.create({
    data: { email: "chen@acme.test", passwordHash, role: "EMPLOYEE", organizationId: org.id },
  });
  await prisma.employee.create({
    data: {
      employeeCode: "EMP-0006",
      userId: recentLeaverUser.id,
      organizationId: org.id,
      firstName: "Chen",
      lastName: "Wu",
      jobTitle: "QA Engineer",
      departmentId: engineering.id,
      hireDate: monthsAgo(14),
      terminationDate: monthsAgo(1),
      status: "TERMINATED",
      baseSalary: 100000,
    },
  });
  const recentHireUser = await prisma.user.create({
    data: { email: "taylor@acme.test", passwordHash, role: "EMPLOYEE", organizationId: org.id },
  });
  const taylor = await prisma.employee.create({
    data: {
      employeeCode: "EMP-0007",
      userId: recentHireUser.id,
      organizationId: org.id,
      firstName: "Taylor",
      lastName: "Brooks",
      jobTitle: "Frontend Engineer",
      departmentId: engineering.id,
      reportsToId: manager.id,
      hireDate: monthsAgo(2),
      baseSalary: 115000,
    },
  });
  await prisma.onboardingTask.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((t, i) => ({
      employeeId: taylor.id,
      title: t.title,
      description: t.description,
      order: i,
      completed: i < 4, // recent hire, further along in onboarding
      completedAt: i < 4 ? monthsAgo(1) : null,
    })),
  });

  // ---------- ATS / Recruitment ----------
  const openPosting = await prisma.jobPosting.create({
    data: {
      organizationId: org.id,
      title: "Backend Engineer",
      departmentId: engineering.id,
      description: "Own our core API services, working closely with Sam's team on the platform roadmap.",
      status: "OPEN",
      postedById: manager.id,
      postedAt: monthsAgo(1),
    },
  });
  await prisma.jobPosting.create({
    data: {
      organizationId: org.id,
      title: "Marketing Intern",
      departmentId: marketing.id,
      description: "Support campaign execution and analytics reporting for the marketing team.",
      status: "DRAFT",
      postedById: adminUser.id,
    },
  });

  const candidateA = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      firstName: "Jordan",
      lastName: "Ade",
      email: "jordan.ade@example.test",
      phone: "+1-555-0100",
      source: "LinkedIn",
    },
  });
  const candidateB = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      firstName: "Riley",
      lastName: "Nakamura",
      email: "riley.nakamura@example.test",
      source: "Referral",
    },
  });
  const candidateC = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      firstName: "Sasha",
      lastName: "Ivanov",
      email: "sasha.ivanov@example.test",
      source: "Career site",
    },
  });

  await prisma.application.create({
    data: { organizationId: org.id, candidateId: candidateA.id, jobPostingId: openPosting.id, stage: "APPLIED" },
  });

  await prisma.application.create({
    data: { organizationId: org.id, candidateId: candidateC.id, jobPostingId: openPosting.id, stage: "SCREENING", notes: "Strong resume, phone screen booked." },
  });

  const interviewApp = await prisma.application.create({
    data: { organizationId: org.id, candidateId: candidateB.id, jobPostingId: openPosting.id, stage: "INTERVIEW" },
  });
  await prisma.interview.create({
    data: {
      applicationId: interviewApp.id,
      organizationId: org.id,
      interviewerId: manager.id,
      scheduledAt: daysFromNow(3),
    },
  });

  // A candidate far enough along to have a pending offer — demonstrates the
  // offer → hire conversion flow is ready to exercise manually.
  const offerCandidate = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      firstName: "Devon",
      lastName: "Park",
      email: "devon.park@example.test",
      source: "Referral",
    },
  });
  const offerApp = await prisma.application.create({
    data: { organizationId: org.id, candidateId: offerCandidate.id, jobPostingId: openPosting.id, stage: "OFFER" },
  });
  await prisma.offer.create({
    data: {
      applicationId: offerApp.id,
      organizationId: org.id,
      proposedSalary: 118000,
      startDate: daysFromNow(21),
      extendedById: manager.id,
    },
  });

  // ---------- Performance: KPIs, meetings, 360 feedback ----------
  await prisma.kpi.createMany({
    data: [
      {
        employeeId: jane.id,
        organizationId: org.id,
        title: "Sprint velocity",
        target: 40,
        current: 34,
        unit: " pts",
        periodStart: monthsAgo(1),
        periodEnd: daysFromNow(10),
        status: "ON_TRACK",
        createdById: manager.id,
      },
      {
        employeeId: jane.id,
        organizationId: org.id,
        title: "Code review turnaround",
        target: 24,
        current: 40,
        unit: "h",
        periodStart: monthsAgo(1),
        periodEnd: daysFromNow(10),
        status: "AT_RISK",
        createdById: manager.id,
      },
    ],
  });

  await prisma.appraisalMeeting.create({
    data: {
      employeeId: jane.id,
      organizerId: manager.id,
      organizationId: org.id,
      scheduledAt: daysFromNow(7),
      notes: "Quarterly check-in — review KPI progress and Q3 goals.",
    },
  });

  await prisma.feedbackRequest.createMany({
    data: [
      { employeeId: jane.id, providerId: jane.id, requestedById: manager.id, organizationId: org.id, relationship: "SELF" },
      { employeeId: jane.id, providerId: manager.id, requestedById: manager.id, organizationId: org.id, relationship: "MANAGER" },
      { employeeId: jane.id, providerId: taylor.id, requestedById: manager.id, organizationId: org.id, relationship: "PEER" },
    ],
  });
  // Manager's feedback already submitted, to show both pending and completed
  // states in the UI at once.
  await prisma.feedbackRequest.updateMany({
    where: { employeeId: jane.id, providerId: manager.id },
    data: {
      submitted: true,
      submittedAt: new Date(),
      strengths: "Consistently reliable, great ownership of the dashboard feature.",
      areasForImprovement: "Could delegate smaller tasks instead of doing everything herself.",
    },
  });

  // ---------- Learning & Development ----------
  const complianceCourse = await prisma.trainingCourse.create({
    data: {
      organizationId: org.id,
      title: "Workplace Safety & Anti-Harassment",
      description: "Mandatory annual compliance training for all employees.",
      category: "COMPLIANCE",
      durationHours: 1.5,
      required: true,
    },
  });
  const skillsCourse = await prisma.trainingCourse.create({
    data: {
      organizationId: org.id,
      title: "Advanced TypeScript",
      description: "Deep dive into generics, type inference, and design patterns.",
      category: "SKILLS",
      durationHours: 4,
    },
  });
  await prisma.trainingCourse.create({
    data: {
      organizationId: org.id,
      title: "Engineering Management Fundamentals",
      description: "For engineers considering a move into management.",
      category: "CAREER",
      durationHours: 3,
    },
  });

  await prisma.trainingEnrollment.create({
    data: {
      employeeId: jane.id,
      courseId: complianceCourse.id,
      status: "OVERDUE",
      dueDate: monthsAgo(1),
      assignedById: hrUser.id,
    },
  });
  await prisma.trainingEnrollment.create({
    data: {
      employeeId: jane.id,
      courseId: skillsCourse.id,
      status: "IN_PROGRESS",
      dueDate: daysFromNow(30),
    },
  });
  await prisma.trainingEnrollment.create({
    data: {
      employeeId: taylor.id,
      courseId: complianceCourse.id,
      status: "NOT_STARTED",
      dueDate: daysFromNow(14),
      assignedById: hrUser.id,
    },
  });

  // ---------- Compliance Management ----------
  // One overdue (demonstrates the reconciliation + red-flag UI), one
  // upcoming, one recurring requirement with a completed history entry.
  await prisma.complianceRequirement.create({
    data: {
      organizationId: org.id,
      title: "Quarterly payroll tax filing",
      jurisdiction: "Kenya",
      frequency: "QUARTERLY",
      nextDueDate: monthsAgo(0, 1), // due earlier this month — will show OVERDUE once reconciled
      records: { create: { organizationId: org.id, dueDate: monthsAgo(0, 1), status: "OVERDUE" } },
    },
  });
  await prisma.complianceRequirement.create({
    data: {
      organizationId: org.id,
      title: "Annual workplace safety report",
      jurisdiction: "Kenya",
      frequency: "ANNUAL",
      nextDueDate: daysFromNow(45),
      records: { create: { organizationId: org.id, dueDate: daysFromNow(45), status: "UPCOMING" } },
    },
  });
  const recurringReq = await prisma.complianceRequirement.create({
    data: {
      organizationId: org.id,
      title: "Monthly statutory deductions remittance",
      jurisdiction: "Kenya",
      frequency: "MONTHLY",
      nextDueDate: daysFromNow(12),
    },
  });
  await prisma.complianceRecord.createMany({
    data: [
      {
        requirementId: recurringReq.id,
        organizationId: org.id,
        dueDate: monthsAgo(1, 5),
        status: "COMPLETE",
        completedAt: monthsAgo(1, 3),
        completedById: hrUser.id,
        notes: "Filed on time via iTax.",
      },
      { requirementId: recurringReq.id, organizationId: org.id, dueDate: daysFromNow(12), status: "UPCOMING" },
    ],
  });

  console.log("Seed complete.");
  console.log("  Admin:    admin@acme.test / Password123!");
  console.log("  HR:       hr@acme.test / Password123!");
  console.log("  Manager:  manager@acme.test / Password123!  (heads Engineering only)");
  console.log("  Employee: jane@acme.test / Password123!     (Engineering)");
  console.log("  Employee: alex@acme.test / Password123!     (Marketing)");
  console.log("  Employee: priya@acme.test / Password123!    (Marketing, terminated — has a contract summary)");
  console.log("  Employee: taylor@acme.test / Password123!   (Engineering, recent hire — onboarding + training + KPI in progress)");
  console.log("  (Morgan and Chen are also seeded, terminated, for turnover trend history — no login needed)");
}

main().finally(() => prisma.$disconnect());
