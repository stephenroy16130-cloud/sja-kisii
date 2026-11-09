import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import ChangeForm from "./change-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AuthShell
      title="Change password"
      subtitle={
        user.mustChangePassword
          ? "Your account was set up with a temporary password. Choose your own to continue."
          : "Choose a new password."
      }
    >
      <ChangeForm forced={user.mustChangePassword} />
      {!user.mustChangePassword && (
        <p className="mt-6 text-sm text-white/50">
          <Link href="/dashboard/profile" className="text-white underline">Back to my profile</Link>
        </p>
      )}
    </AuthShell>
  );
}
