import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Libre_Baskerville, Montserrat } from "next/font/google";
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
  title: "St. John Ambulance - Kisii University",
  description: "Division management system",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${head.variable} ${copy.variable}`}>{children}</body>
    </html>
  );
}
