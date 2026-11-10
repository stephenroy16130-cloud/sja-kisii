"use client";

import { usePathname } from "next/navigation";
import { TIPS } from "@/lib/tips";
import Tip from "./tip";

// Shows the tip for whichever page the member is on. Switched off while the welcome tour is open.
export default function PageTips({ userId, enabled }: { userId: string; enabled: boolean }) {
  const path = usePathname();
  const found = TIPS.find((t) => t.match.test(path));
  if (!enabled || !found) return null;
  return <Tip key={found.tip.id} userId={userId} {...found.tip} />;
}
