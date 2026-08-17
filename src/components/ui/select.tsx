import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, error, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none rounded-lg border bg-surface px-3 py-2 pr-9 text-sm text-foreground transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error ? "border-danger-500" : "border-border-strong",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
  </div>
));
Select.displayName = "Select";

export { Select };
