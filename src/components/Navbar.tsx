"use client";

import Link from "next/link";
import { UserButtonWrapper } from "./auth/UserButtonWrapper";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? "text-[#39E079] font-medium" : "text-gray-600 hover:text-gray-900";
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-xl font-bold text-gray-900">TaskMngr</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`${isActive('/dashboard')} transition-colors`}
            >
              Dashboard
            </Link>
            <Link
              href="/pricing"
              className={`${isActive('/pricing')} transition-colors`}
            >
              Pricing
            </Link>
            <Link
              href="/profile"
              className={`${isActive('/profile')} transition-colors`}
            >
              Profile
            </Link>
            <UserButtonWrapper />
          </div>
        </div>
      </div>
    </div>
  );
}