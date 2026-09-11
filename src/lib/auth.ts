import { AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { rateLimit } from "./rate-limit";

const LOGIN_RATE_LIMIT = 8; // attempts
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000; // per 15 minutes, per IP+email pair

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // NextAuth's CredentialsProvider passes a stripped-down request object
      // (headers as a plain record, not a Headers instance) as the second
      // argument — not the `clientIp(req: Request)` helper's shape, so IP
      // extraction is inlined here rather than reusing that helper as-is.
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(",")[0]?.trim() ?? "unknown";
        const { allowed } = rateLimit(`login:${ip}:${credentials.email.toLowerCase()}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS);
        if (!allowed) return null; // same "Invalid email or password" the UI already shows — doesn't leak that a limit exists

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { employee: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          employeeId: user.employee?.id ?? null,
          name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.employeeId = (user as any).employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).employeeId = token.employeeId;
      }
      return session;
    },
  },
};

// Convenience helper for API routes / server components.
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session;
}
