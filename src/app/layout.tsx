import type { Metadata } from "next";
import "./globals.css";
import "@helios/blocks/themes/professional.css";
import { ThemeProvider } from "@helios/blocks";
import { Providers } from "./providers";
import { AppFrame } from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "Aegis Console",
  description: "Aegis self-hosted PaaS management console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme="professional">
          <Providers>
            <AppFrame>{children}</AppFrame>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
