import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma singleton before importing rbac.ts, since
// managedDepartmentIds/canActOnDepartment query prisma.department directly.
const findManyMock = vi.fn();
vi.mock("../db", () => ({
  prisma: { department: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}));

const { can, managedDepartmentIds, canActOnDepartment } = await import("../rbac");

beforeEach(() => {
  findManyMock.mockReset();
});

describe("rbac: can()", () => {
  it("allows ADMIN and HR to create employees, but not MANAGER or EMPLOYEE", () => {
    expect(can("ADMIN", "employee:create")).toBe(true);
    expect(can("HR", "employee:create")).toBe(true);
    expect(can("MANAGER", "employee:create")).toBe(false);
    expect(can("EMPLOYEE", "employee:create")).toBe(false);
  });

  it("restricts employee:delete to ADMIN only", () => {
    expect(can("ADMIN", "employee:delete")).toBe(true);
    expect(can("HR", "employee:delete")).toBe(false);
  });

  it("allows every role to request leave for themselves", () => {
    for (const role of ["ADMIN", "HR", "MANAGER", "EMPLOYEE"]) {
      expect(can(role, "leave:request")).toBe(true);
    }
  });

  it("returns false for a role that isn't in the permission's allow-list", () => {
    expect(can("EMPLOYEE", "payroll:manage")).toBe(false);
  });
});

describe("rbac: managedDepartmentIds()", () => {
  it("returns the department IDs where the employee is the manager", async () => {
    findManyMock.mockResolvedValue([{ id: "dept-1" }, { id: "dept-2" }]);
    const ids = await managedDepartmentIds("emp-123");
    expect(ids).toEqual(["dept-1", "dept-2"]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { managerId: "emp-123" },
      select: { id: true },
    });
  });

  it("returns an empty array when the employee heads no departments", async () => {
    findManyMock.mockResolvedValue([]);
    const ids = await managedDepartmentIds("emp-999");
    expect(ids).toEqual([]);
  });
});

describe("rbac: canActOnDepartment()", () => {
  it("lets ADMIN and HR act on any department, without even querying managed departments", async () => {
    expect(await canActOnDepartment("ADMIN", null, "dept-1")).toBe(true);
    expect(await canActOnDepartment("HR", "emp-1", "dept-1")).toBe(true);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("lets a MANAGER act only on a department they head", async () => {
    findManyMock.mockResolvedValue([{ id: "dept-1" }]);
    expect(await canActOnDepartment("MANAGER", "emp-1", "dept-1")).toBe(true);
  });

  it("blocks a MANAGER from acting on a department they don't head", async () => {
    findManyMock.mockResolvedValue([{ id: "dept-1" }]);
    expect(await canActOnDepartment("MANAGER", "emp-1", "dept-2")).toBe(false);
  });

  it("blocks EMPLOYEE regardless of department", async () => {
    expect(await canActOnDepartment("EMPLOYEE", "emp-1", "dept-1")).toBe(false);
  });

  it("blocks a MANAGER with no linked employee profile", async () => {
    expect(await canActOnDepartment("MANAGER", null, "dept-1")).toBe(false);
  });

  it("blocks when the target department is null (e.g. employee has no department)", async () => {
    expect(await canActOnDepartment("MANAGER", "emp-1", null)).toBe(false);
  });
});
