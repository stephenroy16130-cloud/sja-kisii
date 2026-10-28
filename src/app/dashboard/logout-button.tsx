"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="text-sm text-neutral-300 hover:text-white">
      Log out
    </button>
  );
}
