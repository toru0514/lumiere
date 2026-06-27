import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-300",
  secondary: "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
  ghost: "text-stone-500 hover:bg-stone-100",
  danger: "text-red-600 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

export const labelClass = "block text-sm font-medium text-stone-700 mb-1";
