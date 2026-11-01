import Link from "next/link";
import { getBrandName } from "@/lib/data/settings";

export async function Logo() {
  const name = await getBrandName();
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" className="fill-brand" />
        {[6, 10, 14, 18].map((x, i) => (
          <rect key={x} x={x} y={14 - [3, 7, 5, 9][i] / 2 - 0} width="2.4" height={[3, 7, 5, 9][i] + 4} rx="1.2" className="fill-brand-ink" transform={`translate(0 ${-2})`} />
        ))}
      </svg>
      {name}
    </Link>
  );
}
