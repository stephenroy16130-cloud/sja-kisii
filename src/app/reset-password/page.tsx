import AuthShell from "@/components/auth-shell";
import ResetForm from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-sm text-white/60">This reset link is missing its token. Request a new one.</p>
      )}
    </AuthShell>
  );
}
