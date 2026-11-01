// Central branding. Change here (or later via system_settings), never hardcode elsewhere.
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Audio Platform",
  description: "Live audio broadcasts and an on-demand audio library.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  accentColor: "#6d28d9",
} as const;
