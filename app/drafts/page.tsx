import { redirect } from "next/navigation";

// 投稿一覧はトップページに統合。旧 URL は維持してリダイレクト。
export default function DraftsPage() {
  redirect("/");
}
