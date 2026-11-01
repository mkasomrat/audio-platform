import { appConfig } from "@/config/app";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        © {new Date().getFullYear()} {appConfig.name}. {appConfig.description}
      </div>
    </footer>
  );
}
