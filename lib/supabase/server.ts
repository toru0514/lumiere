import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * サーバ専用 Supabase クライアント（service role key）。
 * RLS をバイパスして読み書きできるため、必ずサーバ側でのみ生成・使用する。
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase の環境変数が未設定です（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）。",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
