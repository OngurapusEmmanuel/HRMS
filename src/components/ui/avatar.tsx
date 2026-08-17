import * as React from "react";
import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

// Deterministic hue pick from the name so the same person always gets the same color.
const colorSteps = [
  "bg-primary-100 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-warning-100 text-warning-700",
  "bg-danger-100 text-danger-700",
  "bg-info-100 text-info-700",
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colorSteps[hash % colorSteps.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: keyof typeof sizeClasses;
  src?: string | null;
}

function Avatar({ name, size = "md", src, className, ...props }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        sizeClasses[size],
        colorForName(name),
        className
      )}
      {...props}
    >
      {initials(name)}
    </span>
  );
}

export { Avatar };
