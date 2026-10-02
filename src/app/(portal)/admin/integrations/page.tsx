import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { integrationConfigService } from "@/services/integration-config.service";
import { IntegrationConfigManager } from "@/components/admin/integration-config-manager";

export default async function AdminIntegrationsPage() {
  await requireRole(["ADMIN"]);
  const data = await integrationConfigService.listForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">
          ← Administration
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Integrations</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Keys and settings for the services MCG Learn connects to. Values are encrypted at rest and
          secrets are never shown in full once saved. Changes take effect within a minute, with no
          redeploy. If the server also has an environment variable of the same name, that variable
          wins — remove it from the host to let the value here take over.
        </p>
      </div>
      <IntegrationConfigManager initialData={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}
