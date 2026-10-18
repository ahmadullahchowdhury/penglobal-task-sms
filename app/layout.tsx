import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Management System",
  description: "Registry module: enrolment, fees, assessments and results",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense
          fallback={
            <div role="status" className="mx-auto w-full max-w-6xl px-4 py-8 text-muted-foreground">
              Loading…
            </div>
          }
        >
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
