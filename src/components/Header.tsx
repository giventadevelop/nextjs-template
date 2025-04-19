'use client';

import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/event', label: 'Event' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/profile', label: 'Profile' }
];

const Header = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? "text-[#39E079] font-medium" : "text-gray-600 hover:text-gray-900";
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="text-xl font-bold text-gray-900">TaskMngr</span>
            </Link>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {menuItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${isActive(href)} px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`${isActive(href)} block px-3 py-2 rounded-md text-base font-medium transition-colors`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;