"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/planner", label: "撮影プランナー", icon: "✦" },
  { href: "/drafts", label: "下書き", icon: "✎" },
  { href: "/settings/products", label: "商品マスター", icon: "◷" },
  { href: "/settings/materials", label: "木材マスター", icon: "❖" },
  { href: "/settings/backgrounds", label: "背景素材マスター", icon: "❏" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-amber-100 font-medium text-amber-900"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
