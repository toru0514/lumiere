import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ側で使う Supabase クライアント（anon key）。
 * 読み取り専用の用途を想定。書き込みはサーバ側 API / Server Action 経由。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
