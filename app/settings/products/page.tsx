import PageHeader from "@/components/PageHeader";
import ProductTable from "@/components/ProductTable";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <>
      <PageHeader
        title="商品マスター"
        description="撮影プランナーで選ぶ商品を管理します。画像つきで登録すると提案がより具体的になります。"
      />
      <ProductTable products={products} />
    </>
  );
}
