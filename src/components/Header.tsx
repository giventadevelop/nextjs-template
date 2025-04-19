'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

const menuItems = [
  { href: "/event", label: "Event" },
  { href: "/pricing", label: "Pricing" },
];

export function Header() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Skip rendering header on auth pages
  if (pathname?.startsWith("/sign-")) return null;

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl">📋</span>
            <span className="text-xl font-bold text-gray-900">TaskMngr</span>
          </Link>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4 md:space-x-6 lg:space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${pathname === item.href ? "text-gray-900" : ""
                  }`}
              >
                {item.label}
              </Link>
            ))}
            {!userId ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-[#39E079] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#32c96d]"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${pathname === "/dashboard" ? "text-gray-900" : ""
                    }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${pathname === "/profile" ? "text-gray-900" : ""
                    }`}
                >
                  Profile
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden pt-2 pb-3 space-y-1`}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium ${pathname === item.href ? "text-gray-900 bg-gray-50" : ""
                }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {!userId ? (
            <>
              <Link
                href="/sign-in"
                className="block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="block bg-[#39E079] text-white px-3 py-2 rounded-md text-base font-medium hover:bg-[#32c96d] mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium ${pathname === "/dashboard" ? "text-gray-900 bg-gray-50" : ""
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className={`block text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-base font-medium ${pathname === "/profile" ? "text-gray-900 bg-gray-50" : ""
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              <div className="px-3 py-2">
                <UserButton afterSignOutUrl="/" />
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}