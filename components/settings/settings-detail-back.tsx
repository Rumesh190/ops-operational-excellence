"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";

interface SettingsDetailBackProps {
  /** The parent settings landing page to return to. Defaults to the global Settings hub. */
  backHref?: string;
  /** Link text. Defaults to "Back to Settings". */
  label?: string;
}

export function SettingsDetailBack({
  backHref = "/settings",
  label = "Back to Settings",
}: SettingsDetailBackProps) {
  const pathname = usePathname();
  if (pathname === backHref) return null;
  return (
    <Link
      href={backHref}
      className="inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </Link>
  );
}
