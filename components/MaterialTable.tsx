"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { Material } from "@/types";
import {
  createMaterial,
  deleteMaterial,
  updateMaterial,
} from "@/app/settings/materials/actions";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Button, inputClass, labelClass } from "@/components/ui";

interface FormState {
  id: string | null;
  name: string;
  description: string;
}

const EMPTY: FormState = { id: null, name: "", description: "" };

export default function MaterialTable({ materials }: { materials: Material[] }) {
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

  function openEdit(m: Material) {
    setForm({ id: m.id, name: m.name, description: m.description ?? "" });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const input = { name: form.name, description: form.description };
      const res = form.id
        ? await updateMaterial(form.id, input)
        : await createMaterial(input);
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました。");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove(m: Material) {
    if (!confirm(`「${m.name}」を削除しますか？`)) return;
    startTransition(async () => {
      const res = await deleteMaterial(m.id);
      if (!res.ok) {
        alert(res.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<Material>[]>(
    () => [
      { header: "木材名", accessorKey: "name" },
      {
        header: "特徴",
        accessorKey: "description",
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
    data: materials,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>＋ 木材を追加</Button>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          title="まだ木材がありません"
          description="ウォルナットやメープルなど、使う木材と特徴を登録すると投稿文に反映されます。"
          action={<Button onClick={openCreate}>＋ 木材を追加</Button>}
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
        title={form.id ? "木材を編集" : "木材を追加"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>木材名 *</label>
            <input
              className={inputClass}
              value={form.name}
              placeholder="ウォルナット"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>特徴（投稿文の生成に使用）</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              placeholder="濃い褐色で重厚な木目。使うほど艶が増す。など"
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
