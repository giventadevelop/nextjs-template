import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { fetchUserProfileServer } from "./ApiServerActions";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user profile server-side
  const userProfile = await fetchUserProfileServer(userId);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="space-y-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Manage Account</h2>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          </div>
        </div>
        <div className="rounded-xl shadow p-8 sm:p-10" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0f7fa 100%)' }}>
          <p className="mb-6 text-sm text-gray-500 font-medium">Update your contact information.</p>
          <ProfileForm initialProfile={userProfile} />
        </div>
      </div>
    </div>
  );
}