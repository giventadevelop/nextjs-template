import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              TaskMngr
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Settings
              </Link>
              <div suppressHydrationWarning>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}