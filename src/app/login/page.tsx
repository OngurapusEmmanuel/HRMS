"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// Seeded demo accounts (see prisma/seed.ts) — only ever shown outside
// production, so a real deployment never exposes a one-click login panel.
const DEMO_PASSWORD = "Password123!";
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@acme.test" },
  { role: "HR", email: "hr@acme.test" },
  { role: "Manager", email: "manager@acme.test" },
  { role: "Employee", email: "jane@acme.test" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function performLogin(loginEmail: string, loginPassword: string, key: string) {
    setLoading(key);
    setError(null);
    const res = await signIn("credentials", { email: loginEmail, password: loginPassword, redirect: false });
    setLoading(null);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    performLogin(email, password, "form");
  }

  function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    performLogin(demoEmail, DEMO_PASSWORD, demoEmail);
  }

  return (
    <AuthCard title="HR System" description="Sign in to your workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" className="w-full" loading={loading === "form"} disabled={loading !== null}>
          {loading === "form" ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <Link href="/forgot-password" className="mt-4 block text-center text-sm text-muted hover:text-foreground">
        Forgot password?
      </Link>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-2.5 text-center text-xs font-medium uppercase tracking-wide text-muted">
            Demo accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="outline"
                size="sm"
                loading={loading === a.email}
                disabled={loading !== null}
                onClick={() => quickLogin(a.email)}
                title={a.email}
              >
                {loading === a.email ? "Signing in..." : a.role}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted">Password: {DEMO_PASSWORD}</p>
        </div>
      )}
    </AuthCard>
  );
}
