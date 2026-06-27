export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-stone-400">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      読み込み中…
    </div>
  );
}
