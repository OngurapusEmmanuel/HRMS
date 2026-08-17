import { Building } from "lucide-react";

export default function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
            <Building className="h-5 w-5" />
          </span>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 shadow-soft">
          <h1 className="mb-1 text-xl font-semibold text-foreground">{title}</h1>
          <p className="mb-6 text-sm text-secondary">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
