"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface Props {
  text: string;
  label?: string;
  variant?: "primary" | "secondary";
}

export default function CopyButton({ text, label = "キャプションをコピー", variant = "primary" }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // クリップボード非対応環境向けフォールバック
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <Button variant={variant} onClick={copy}>
      {copied ? "コピーしました ✓" : label}
    </Button>
  );
}
