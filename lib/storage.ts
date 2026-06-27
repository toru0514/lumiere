import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase/constants";

/** Storage 上の画像を削除する（孤児ファイル防止のため SQL ではなく API で削除）。 */
export async function deleteImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const supabase = createServiceClient();
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
