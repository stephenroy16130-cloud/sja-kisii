import AuthShell from "@/components/auth-shell";
import ResetForm from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string; token?: string }>;
}) {
  const params = await searchParams;
  const initialEmail = params.email ?? "";
  const initialCode = params.code ?? params.token ?? "";

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the 6-digit code sent to your email and your new password."
    >
      <ResetForm initialEmail={initialEmail} initialCode={initialCode} />
    </AuthShell>
  );
}
