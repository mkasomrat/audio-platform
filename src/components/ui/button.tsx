import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-brand text-brand-ink hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-bg",
  ghost: "text-ink hover:bg-surface",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

type Props = { variant?: keyof typeof variants; className?: string; href?: string } &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", className, href, ...rest }: Props) {
  const cls = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none",
    variants[variant], className,
  );
  if (href) return <Link href={href} className={cls}>{rest.children}</Link>;
  return <button className={cls} {...rest} />;
}
