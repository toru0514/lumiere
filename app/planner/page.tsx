import PageHeader from "@/components/PageHeader";
import Planner from "@/components/Planner";
import { getBackgrounds, getMaterials, getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const [products, materials, backgrounds] = await Promise.all([
    getProducts(),
    getMaterials(),
    getBackgrounds(),
  ]);
  return (
    <>
      <PageHeader
        title="撮影プランナー"
        description="商品・木材・背景素材を選んで、構図・ライティング・投稿文・ハッシュタグを生成します。"
      />
      <Planner products={products} materials={materials} backgrounds={backgrounds} />
    </>
  );
}
