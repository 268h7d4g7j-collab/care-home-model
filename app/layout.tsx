import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "Care Home Revenue",
  description:
    "Care home revenue management — fictional demonstration workspace",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
