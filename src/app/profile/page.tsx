import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { fetchUserProfileServer } from "./ApiServerActions";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user profile server-side with automatic creation
  const userProfile = await fetchUserProfileServer(userId);

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto" style={{ paddingTop: '118px' }}>
      <div className="space-y-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Manage Account</h2>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          </div>
        </div>

        {/* Show info message if profile was just created */}
        {userProfile && !userProfile.email && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Profile Created Successfully!</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Your profile has been automatically created. Please complete your information below.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl shadow p-8 sm:p-10" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0f7fa 100%)' }}>
          <p className="mb-6 text-sm text-gray-500 font-medium">Update your contact information.</p>
          <ProfileForm initialProfile={userProfile} />
        </div>
      </div>
    </div>
  );
}