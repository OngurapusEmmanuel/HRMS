import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      error ? "border-danger-500" : "border-border-strong",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
