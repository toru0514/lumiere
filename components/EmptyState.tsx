import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
      <p className="text-sm font-medium text-stone-600">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
