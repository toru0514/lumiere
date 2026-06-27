"use client";

interface Props {
  name: string;
  subtitle?: string | null;
  imageUrl: string | null;
  selected: boolean;
  badge?: string | null;
  onClick: () => void;
}

export default function SelectableCard({
  name,
  subtitle,
  imageUrl,
  selected,
  badge,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-white text-left transition ${
        selected
          ? "border-amber-500 ring-2 ring-amber-200"
          : "border-stone-200 hover:border-amber-300"
      }`}
    >
      <div className="aspect-square w-full bg-stone-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            画像なし
          </div>
        )}
      </div>
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs text-white shadow">
          {badge ?? "✓"}
        </span>
      )}
      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium text-stone-800">{name}</p>
        {subtitle && <p className="truncate text-xs text-stone-400">{subtitle}</p>}
      </div>
    </button>
  );
}
