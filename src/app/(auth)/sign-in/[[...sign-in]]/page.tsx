import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-50 py-2">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center text-gray-900">Welcome Back</h1>
        <p className="mt-2 text-center text-gray-600">Sign in to continue</p>
      </div>
      <SignIn />
    </div>
  );
}