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
    <button
      onClick={logout}
      className="rounded-lg border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white hover:text-black"
    >
      Log out
    </button>
  );
}
