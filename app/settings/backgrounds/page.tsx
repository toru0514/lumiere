import PageHeader from "@/components/PageHeader";
import BackgroundTable from "@/components/BackgroundTable";
import { getBackgrounds } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BackgroundsPage() {
  const backgrounds = await getBackgrounds();
  return (
    <>
      <PageHeader
        title="背景素材マスター"
        description="家具・ガラス・ドリンクなど、商品と組み合わせる背景素材を管理します。"
      />
      <BackgroundTable backgrounds={backgrounds} />
    </>
  );
}
