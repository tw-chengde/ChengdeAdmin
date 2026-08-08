import type { ReactNode } from "react";
import { PlatformSettingsProvider } from "@/app/dashboard/platform-settings-context";

export default function PlatformAwareLayout({ children }: { children: ReactNode }) {
  return <PlatformSettingsProvider>{children}</PlatformSettingsProvider>;
}