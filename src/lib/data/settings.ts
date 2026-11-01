import { createClient } from "@/lib/supabase/server";
import { appConfig } from "@/config/app";

export async function getBrandName() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return appConfig.name;
    const supabase = await createClient();
    const { data } = await supabase.from("system_settings").select("value").eq("key", "branding").maybeSingle();
    const n = (data?.value as { name?: string } | undefined)?.name;
    return n?.trim() || appConfig.name;
  } catch { return appConfig.name; }
}
