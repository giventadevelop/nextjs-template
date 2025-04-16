import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { SideNav } from "@/components/side-nav";
import { Navbar } from "@/components/Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <Navbar />

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <SideNav />

        {/* Main content */}
        <div className="flex-1">
          {/* Page content */}
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}