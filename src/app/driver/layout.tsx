import type { Metadata } from "next";
import DriverShell from "./DriverShell";

export const metadata: Metadata = {
  title: { default: "المناديب", template: "%s | مركز الأحمدي - المناديب" },
  robots: { index: false, follow: false },
  manifest: "/manifest-driver.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "المناديب",
  },
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DriverShell>{children}</DriverShell>;
}
