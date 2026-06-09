import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechEvent — Run your next tech event like clockwork",
  description:
    "Beautiful event pages, instant Razorpay checkout, WhatsApp confirmations, and QR check-in at the door. Built for Indian hackathons, dev meetups, and startup demo days.",
  openGraph: {
    title: "TechEvent",
    description:
      "A Luma-inspired events platform for Indian college tech events. Razorpay · WhatsApp · QR entry.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
