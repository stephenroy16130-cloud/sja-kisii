import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Libre_Baskerville, Montserrat } from "next/font/google";
import PwaRegister from "@/components/pwa-register";
import ToastHost from "@/components/toast";
import "./globals.css";

const head = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-montserrat",
});
const copy = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-baskerville",
});

export const metadata: Metadata = {
  title: { default: "St. John Ambulance · Kisii University", template: "%s · SJA Kisii" },
  description: "Division management system",
  applicationName: "SJA Kisii",
  appleWebApp: { capable: true, title: "SJA Kisii", statusBarStyle: "black" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${head.variable} ${copy.variable}`}>
        <PwaRegister />
        <ToastHost />
        {children}
      </body>
    </html>
  );
}
