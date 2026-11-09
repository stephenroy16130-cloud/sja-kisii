import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAlertSettings, whatsappConfigured } from "@/lib/finance-alerts";
import { mailConfigured } from "@/lib/mail";
import { pushConfigured } from "@/lib/push";
import { can } from "@/lib/rbac";
import AlertsForm from "./alerts-form";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "finance:manage")) redirect("/dashboard");

  const settings = await getAlertSettings();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/finance" className="text-sm text-white/50 hover:text-white">← Finance</Link>
        <h1 className="mt-3 text-3xl font-light tracking-tight">Payment alerts</h1>
        <p className="mt-1 text-sm text-white/50">
          Get told the moment someone pays by M-Pesa. Change where the alerts go at any time.
        </p>
      </div>
      <AlertsForm
        initial={settings}
        ready={{ push: pushConfigured(), email: mailConfigured(), whatsapp: whatsappConfigured() }}
      />
    </div>
  );
}
