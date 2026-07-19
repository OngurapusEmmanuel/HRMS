import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import NewCourseButton from "@/components/learning/NewCourseButton";
import CourseCatalog from "@/components/learning/CourseCatalog";

export default async function LearningPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;

  const [courses, myEnrollments] = await Promise.all([
    prisma.trainingCourse.findMany({
      where: { organizationId },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
    employeeId
      ? prisma.trainingEnrollment.findMany({ where: { employeeId }, select: { courseId: true, status: true } })
      : [],
  ]);

  const enrollmentByCourseId = new Map(myEnrollments.map((e) => [e.courseId, e.status]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Learning & Development</h1>
        {can(role, "training:manage") && <NewCourseButton />}
      </div>

      <CourseCatalog
        initialCourses={courses.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          durationHours: c.durationHours.toString(),
          required: c.required,
          enrolled: enrollmentByCourseId.has(c.id),
          enrollmentStatus: enrollmentByCourseId.get(c.id) ?? null,
        }))}
      />
    </div>
  );
}
