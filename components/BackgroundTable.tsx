"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { BACKGROUND_TAGS, tagLabel, type Background } from "@/types";
import {
  createBackground,
  deleteBackground,
  updateBackground,
} from "@/app/settings/backgrounds/actions";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Button, inputClass, labelClass } from "@/components/ui";

interface FormState {
  id: string | null;
  name: string;
  tag: string;
  mood: string;
  description: string;
}

const EMPTY: FormState = {
  id: null,
  name: "",
  tag: BACKGROUND_TAGS[0].value,
  mood: "",
  description: "",
};

export default function BackgroundTable({ backgrounds }: { backgrounds: Background[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Background) {
    setForm({
      id: b.id,
      name: b.name,
      tag: b.tag ?? BACKGROUND_TAGS[0].value,
      mood: b.mood ?? "",
      description: b.description ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const input = {
        name: form.name,
        tag: form.tag,
        mood: form.mood,
        description: form.description,
      };
      const res = form.id
        ? await updateBackground(form.id, input)
        : await createBackground(input);
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました。");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove(b: Background) {
    if (!confirm(`「${b.name}」を削除しますか？`)) return;
    startTransition(async () => {
      const res = await deleteBackground(b.id);
      if (!res.ok) {
        alert(res.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<Background>[]>(
    () => [
      { header: "名前", accessorKey: "name" },
      {
        header: "タグ",
        accessorKey: "tag",
        cell: ({ getValue }) => tagLabel(getValue<string | null>()),
      },
      {
        header: "雰囲気",
        accessorKey: "mood",
        cell: ({ getValue }) => getValue<string | null>() ?? "—",
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => openEdit(row.original)}>
              編集
            </Button>
            <Button variant="danger" onClick={() => remove(row.original)}>
              削除
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: backgrounds,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>＋ 背景素材を追加</Button>
      </div>

      {backgrounds.length === 0 ? (
        <EmptyState
          title="まだ背景素材がありません"
          description="家具・ガラス・ドリンクなど、撮影に使える素材を登録しましょう。"
          action={<Button onClick={openCreate}>＋ 背景素材を追加</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 font-medium">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-stone-50/60">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-stone-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={form.id ? "背景素材を編集" : "背景素材を追加"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>名前 *</label>
            <input
              className={inputClass}
              value={form.name}
              placeholder="アンティークの木製チェスト"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>タグ</label>
            <select
              className={inputClass}
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
            >
              {BACKGROUND_TAGS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>雰囲気</label>
            <input
              className={inputClass}
              value={form.mood}
              placeholder="シック / あたたかい など"
              onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClass}>雰囲気メモ（生成プロンプトに使用）</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              placeholder="質感、色味、合わせると映える商品など"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "保存中…" : "保存"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
