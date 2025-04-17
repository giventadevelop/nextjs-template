import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Profile - TaskMngr",
  description: "Update your profile information",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
            <a
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now →
            </a>
          </div>
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}