import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { UserProvider } from "@/components/providers/user-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Gestión",
  description: "Plataforma integral de operaciones",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json" // Next.js generates this from manifest.ts
};

// ... imports
import { createClient } from "@/lib/supabase/server";
import { getSystemSettings } from "./admin/settings-actions";

// ... existing imports


import { PushNotificationManager } from "@/components/PushNotificationManager";
import { GlobalPermissions } from "@/components/GlobalPermissions";
import { InstallPrompt } from "@/components/InstallPrompt";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }


  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider initialUser={user} initialProfile={profile}>
            {children}
            <Toaster richColors position="top-center" />
            <PushNotificationManager />
            <GlobalPermissions />
            <InstallPrompt />
        </UserProvider>
      </body>
    </html>
  );
}
