import { appConfig } from "@/config/app";
import { getBrandName } from "@/lib/data/settings";

export async function SiteFooter() {
  const name = await getBrandName();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        © {new Date().getFullYear()} {name}. {appConfig.description}
      | Developed by <a href="https://mkasomrat.com">Muhammad Kawsar Ahmad Somrat ⇗</a></div>
    </footer>
  );
}
