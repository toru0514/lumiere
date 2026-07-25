"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  METAL_OPTIONS,
  PRODUCT_CATEGORIES,
  categoryLabel,
  metalLabel,
  type Product,
} from "@/types";
import { PRICE_TABLE } from "@/lib/brand";
import { createProduct, deleteProduct, updateProduct } from "@/app/settings/products/actions";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { Button, inputClass, labelClass } from "@/components/ui";

interface FormState {
  id: string | null;
  name: string;
  category: string;
  material: string;
  description: string;
  priceMin: string;
  metal: string;
  sizeRange: string;
}

const EMPTY: FormState = {
  id: null,
  name: "",
  category: PRODUCT_CATEGORIES[0].value,
  material: "",
  description: "",
  priceMin: "",
  metal: "unknown",
  sizeRange: "",
};

export default function ProductTable({ products }: { products: Product[] }) {
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

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      category: p.category,
      material: p.material ?? "",
      description: p.description ?? "",
      priceMin: p.price_min != null ? String(p.price_min) : "",
      metal: p.metal ?? "unknown",
      sizeRange: p.size_range ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const input = {
        name: form.name,
        category: form.category,
        material: form.material,
        description: form.description,
        price_min: form.priceMin.trim() === "" ? null : Number(form.priceMin),
        metal: form.metal,
        size_range: form.sizeRange,
      };
      const res = form.id
        ? await updateProduct(form.id, input)
        : await createProduct(input);
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました。");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove(p: Product) {
    if (!confirm(`「${p.name}」を削除しますか？`)) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      if (!res.ok) {
        alert(res.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { header: "商品名", accessorKey: "name" },
      {
        header: "カテゴリ",
        accessorKey: "category",
        cell: ({ getValue }) => categoryLabel(getValue<string>()),
      },
      {
        header: "価格（〜から）",
        id: "price",
        cell: ({ row }) => {
          const p = row.original;
          const price = p.price_min ?? PRICE_TABLE[p.category];
          if (!price) return "—";
          return (
            <span className={p.price_min == null ? "text-stone-400" : undefined}>
              ¥{price.toLocaleString("ja-JP")}〜
            </span>
          );
        },
      },
      {
        header: "金属",
        accessorKey: "metal",
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return v && v !== "unknown" ? metalLabel(v) : "—";
        },
      },
      {
        header: "素材",
        accessorKey: "material",
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
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>＋ 商品を追加</Button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="まだ商品がありません"
          description="商品を追加すると、撮影プランナーで選べるようになります。"
          action={<Button onClick={openCreate}>＋ 商品を追加</Button>}
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
        title={form.id ? "商品を編集" : "商品を追加"}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>商品名 *</label>
            <input
              className={inputClass}
              value={form.name}
              placeholder="木の指輪"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>カテゴリ *</label>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>最低価格（税込・円）</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                step={100}
                value={form.priceMin}
                placeholder={
                  PRICE_TABLE[form.category]
                    ? String(PRICE_TABLE[form.category])
                    : "未設定"
                }
                onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))}
              />
              <p className="mt-1 text-xs text-stone-400">
                投稿文では「¥4,000〜（税込）」の形で使われます。空ならカテゴリ既定の価格。
              </p>
            </div>
            <div>
              <label className={labelClass}>サイズ</label>
              <input
                className={inputClass}
                value={form.sizeRange}
                placeholder="3〜25号"
                onChange={(e) => setForm((f) => ({ ...f, sizeRange: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>金属の使用</label>
            <select
              className={inputClass}
              value={form.metal}
              onChange={(e) => setForm((f) => ({ ...f, metal: e.target.value }))}
            >
              {METAL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-400">
              「未確認」のままだと、投稿文でこの商品の金属使用には触れません。
            </p>
          </div>

          <div>
            <label className={labelClass}>素材</label>
            <input
              className={inputClass}
              value={form.material}
              placeholder="カリン / パープルハート など"
              onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClass}>特徴メモ（生成プロンプトに使用）</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              placeholder="木目の表情、仕上げ、サイズ感など"
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
