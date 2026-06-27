"use client";

interface Props {
  name: string;
  subtitle?: string | null;
  selected: boolean;
  badge?: string | null;
  onClick: () => void;
}

export default function SelectableCard({
  name,
  subtitle,
  selected,
  badge,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-20 flex-col justify-center rounded-xl border bg-white px-4 py-3 text-left transition ${
        selected
          ? "border-amber-500 ring-2 ring-amber-200"
          : "border-stone-200 hover:border-amber-300"
      }`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs text-white shadow">
          {badge ?? "✓"}
        </span>
      )}
      <p className="pr-6 text-sm font-medium leading-snug text-stone-800 break-words">{name}</p>
      {subtitle && <p className="mt-0.5 text-xs text-stone-400 break-words">{subtitle}</p>}
    </button>
  );
}
