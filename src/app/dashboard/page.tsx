import { auth } from "@clerk/nextjs";

export default async function DashboardPage() {
  const { userId } = auth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">Welcome to your dashboard! User ID: {userId}</p>

        {/* Add your dashboard content here */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900">Tasks Overview</h2>
            <p className="text-blue-700 mt-2">View and manage your tasks</p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-green-900">Projects</h2>
            <p className="text-green-700 mt-2">Track your ongoing projects</p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-purple-900">Analytics</h2>
            <p className="text-purple-700 mt-2">View your performance metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
