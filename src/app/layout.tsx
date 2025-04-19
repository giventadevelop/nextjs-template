import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import TrpcProvider from "@/lib/trpc/Provider";
import Script from "next/script";
import Header from "@/components/Header";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookies = headersList.get("cookie") ?? "";

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
          <TrpcProvider cookies={cookies}>
            <Header />
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