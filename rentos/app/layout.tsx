import type { Metadata } from "next";
import { Archivo, Inter_Tight } from "next/font/google";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/lib/config/app";
import "./globals.css";

/**
 * The two faces the prototype uses. Inter Tight carries the interface;
 * Archivo is display only, headings and figures. Archivo's width axis is
 * loaded because the compact setting is what gives the design its editorial
 * feel — without it the headings read wide and generic.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  // `axes` is only valid on a variable font, which means weight must be
  // variable too: next/font rejects a fixed weight list alongside an axis.
  // Omitting weight loads the full 100..900 range, so the width axis stays
  // available and the headings keep their compact setting. The stylesheet
  // asks for font-stretch: 106%, which needs wdth to be live.
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Rental Property Operating System`,
  description: APP_CONFIG.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${archivo.variable}`}>
      <body className="bg-paper text-neutral-900 antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
