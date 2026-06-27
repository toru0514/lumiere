import PageHeader from "@/components/PageHeader";
import MaterialTable from "@/components/MaterialTable";
import { getMaterials } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const materials = await getMaterials();
  return (
    <>
      <PageHeader
        title="木材マスター"
        description="商品に使う木材と特徴を管理します。特徴は投稿文の生成に使われます。"
      />
      <MaterialTable materials={materials} />
    </>
  );
}
