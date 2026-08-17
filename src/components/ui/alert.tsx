import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm", {
  variants: {
    variant: {
      success: "border-success-100 bg-success-100 text-success-700",
      error: "border-danger-100 bg-danger-100 text-danger-700",
      warning: "border-warning-100 bg-warning-100 text-warning-700",
    },
  },
  defaultVariants: { variant: "error" },
});

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "error"];
  return (
    <div className={cn(alertVariants({ variant, className }))} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export { Alert };
