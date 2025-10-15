"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { SidebarProvider } from "@/hooks/useSidebar";
import { LoadingProvider } from "@/hooks/useLoading";
import { NotificationProvider } from "@/hooks/useNotificationCenter";
import ProgressBar from "@/components/ProgressBar";
import LoadingIndicator from "@/components/LoadingIndicator";
import "./globals.css";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ProgressBar />
        <QueryClientProvider client={queryClient}>
          <LoadingProvider>
            <AuthProvider>
              <NotificationProvider>
                <SidebarProvider>
                  {children}
                  <LoadingIndicator />
                </SidebarProvider>
              </NotificationProvider>
            </AuthProvider>
          </LoadingProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
