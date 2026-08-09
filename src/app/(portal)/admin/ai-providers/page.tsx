import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { aiProviderService } from "@/services/ai-provider.service";
import { AiProviderManager } from "@/components/admin/ai-provider-manager";

export default async function AdminAiProvidersPage() {
  await requireRole(["ADMIN"]);
  const configs = await aiProviderService.listForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">
          ← Administration
        </Link>
        <h1 className="mt-2 text-3xl font-bold">AI Providers</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Manage the API keys that power &ldquo;Generate with AI&rdquo; on the Feed page. Keys are
          encrypted at rest and never shown in full once saved. Providers are tried in priority
          order (lowest first) until one succeeds.
        </p>
      </div>
      <AiProviderManager initialConfigs={JSON.parse(JSON.stringify(configs))} />
    </div>
  );
}
