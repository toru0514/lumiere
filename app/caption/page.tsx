import PageHeader from "@/components/PageHeader";
import CaptionFromPhoto from "@/components/CaptionFromPhoto";

export const dynamic = "force-dynamic";

export default function CaptionPage() {
  return (
    <>
      <PageHeader
        title="写真から投稿文"
        description="撮影済みの写真をアップロードして、投稿文とハッシュタグを生成します。"
      />
      <CaptionFromPhoto />
    </>
  );
}
