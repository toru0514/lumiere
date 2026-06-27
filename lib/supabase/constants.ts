export const STORAGE_BUCKET = "lumiere-images";

/** Storage 上のパスから public URL を組み立てる。 */
export function storagePublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
