import type { Metadata } from "next";
import "./globals.css";
import "@helios/blocks/themes/professional.css";

export const metadata: Metadata = {
  title: "Aegis Console",
  description: "Aegis self-hosted PaaS management console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
