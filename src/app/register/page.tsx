import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import { db } from "@/lib/db";
import RegisterForm from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const setting = await db.systemSetting.findUnique({ where: { key: "registrationOpen" } });
  const open = setting?.value === true;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Your DO Admin and then your Crew Sgt or Corporal will approve it."
    >
      {open ? (
        <RegisterForm />
      ) : (
        <div className="rounded-xl border border-white/10 p-4 text-sm text-white/60">
          Registration is currently closed. Please check back when the DO Admin opens it.
        </div>
      )}
      <p className="mt-6 text-sm text-white/50">
        Already have an account? <Link href="/login" className="text-white underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
