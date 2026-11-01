import { cn } from "@/lib/utils";

type Props = { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, error, id, className, ...rest }: Props) {
  const fid = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fid} className="text-sm font-medium">{label}</label>
      <input id={fid} aria-invalid={Boolean(error)} aria-describedby={error ? `${fid}-err` : undefined}
        className={cn("min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base placeholder:text-muted", error && "border-danger", className)}
        {...rest} />
      {error && <p id={`${fid}-err`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
