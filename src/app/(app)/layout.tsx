import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="text-lg font-bold mb-8">TaskMngr</div>
          {/* Add sidebar navigation items here */}
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Top navbar */}
          <div className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>

          {/* Page content */}
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}