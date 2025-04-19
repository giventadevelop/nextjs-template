import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import TrpcProvider from "@/lib/trpc/Provider";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskMngr - Your Task Management Solution",
  description: "Manage your tasks efficiently with TaskMngr",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get headers early to avoid issues with dynamic usage
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') ?? '';

  // Debug Clerk configuration
  if (process.env.NODE_ENV === 'development') {
    console.log('Clerk Configuration:', {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10) + '...',
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    });
  }

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    console.error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="p-4">
            <h1 className="text-red-500">Configuration Error</h1>
            <p>Please check your environment variables.</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkProvider
          appearance={{
            layout: {
              socialButtonsPlacement: "bottom",
              socialButtonsVariant: "iconButton",
              shimmer: true,
            },
            elements: {
              formButtonPrimary: "bg-[#39E079] hover:bg-[#32c96d]",
              card: "bg-white dark:bg-gray-800",
              navbar: "bg-white dark:bg-gray-800",
              userButtonBox: "hover:bg-gray-100 dark:hover:bg-gray-700",
              userButtonTrigger: "rounded-full",
              userButtonAvatarBox: "rounded-full",
              avatarBox: "h-10 w-10",
              userButtonPopoverCard: "shadow-lg border dark:border-gray-700",
              userPreviewMainIdentifier: "font-semibold",
              userPreviewSecondaryIdentifier: "text-gray-500 dark:text-gray-400",
            },
            variables: {
              borderRadius: "0.5rem",
              colorPrimary: "#39E079",
            },
          }}
        >
          <TrpcProvider cookies={cookieHeader}>
            {children}
          </TrpcProvider>
        </ClerkProvider>
        <Script
          id="hcaptcha-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.hcaptchaConfig = {
                passive: true,
                usePassiveEventListeners: true
              };
            `,
          }}
        />
      </body>
    </html>
  );
}