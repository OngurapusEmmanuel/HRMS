"use client";

import { useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    // Always show the same confirmation, whether or not the email exists —
    // matches the API's anti-enumeration behavior.
    setSubmitted(true);
  }

  return (
    <AuthCard title="Reset your password" description="We'll email you a link to set a new one.">
      {submitted ? (
        <p className="text-sm text-foreground">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}

      <Link href="/login" className="mt-4 block text-center text-sm text-muted hover:text-foreground">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
