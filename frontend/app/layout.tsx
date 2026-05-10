import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SonicLab - Futuristic Audio Processing",
  description: "Minimal, powerful audio visualization and analysis with real-time spectral processing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
