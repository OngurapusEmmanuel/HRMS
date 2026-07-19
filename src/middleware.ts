export { default } from "next-auth/middleware";

// Runs at the edge before any (dashboard) route renders — cheaper and
// earlier than the per-layout session check, which stays too as defense in depth.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employees/:path*",
    "/departments/:path*",
    "/recruitment/:path*",
    "/leaves/:path*",
    "/attendance/:path*",
    "/appraisals/:path*",
    "/feedback/:path*",
    "/learning/:path*",
    "/payroll/:path*",
    "/audit-log/:path*",
    "/org-chart/:path*",
    "/settings/:path*",
    "/compliance/:path*",
    "/reports/:path*",
  ],
};
