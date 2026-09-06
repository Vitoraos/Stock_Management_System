"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

export function TopNav() {
  const pathname = usePathname();
  const title =
    pathname.split("/")[1]?.replace(/^\w/, (c) => c.toUpperCase()) || "Home";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
      <h2 className="text-lg font-semibold text-foreground capitalize">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <Link
          href="/reports"
          className="-m-2 p-2 rounded-md hover:bg-card-highlight"
          aria-label="Reports"
          title="View Reports"
        >
          <Bell size={18} className="text-muted-foreground" />
        </Link>
      </div>
    </header>
  );
}
