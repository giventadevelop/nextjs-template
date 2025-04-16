"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function Navbar() {
  return (
    <div className="h-16 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-xl font-bold text-gray-900">TaskMngr</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </div>
  );
}