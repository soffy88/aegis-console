import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Aegis Console",
  description: "AI-powered self-hosted PaaS dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
