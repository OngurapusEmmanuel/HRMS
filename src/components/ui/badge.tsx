import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      neutral: "bg-surface-2 text-secondary",
      primary: "bg-primary-100 text-primary-700",
      success: "bg-success-100 text-success-700",
      warning: "bg-warning-100 text-warning-700",
      danger: "bg-danger-100 text-danger-700",
      info: "bg-info-100 text-info-700",
    },
  },
  defaultVariants: { variant: "neutral" },
});

const dotVariants: Record<string, string> = {
  neutral: "bg-muted",
  primary: "bg-primary-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotVariants[variant ?? "neutral"])} />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
