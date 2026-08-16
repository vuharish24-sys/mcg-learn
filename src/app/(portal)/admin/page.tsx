import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getFunnelSummary } from "@/services/funnel.service";
import { getBrandingLogoUrl } from "@/lib/branding";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { PropertySelect } from "@/components/forms/property-select";
import { BrandingLogoForm } from "@/components/forms/branding-logo-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  await requireRole(["ADMIN"]);
  const [users, roles, categories, settings, funnel, logoUrl] = await Promise.all([
    prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.feedCategory.findMany({ include: { _count: { select: { feedItems: true } } }, orderBy: { name: "asc" } }),
    prisma.setting.findMany({ orderBy: { key: "asc" } }),
    getFunnelSummary(30),
    getBrandingLogoUrl(),
  ]);
  const roleOptions = roles.map((role) => ({ value: role.id, label: role.name }));

  return (
    <div className="space-y-7">
      <div><p className="text-sm font-semibold text-teal-700">Administration</p><h1 className="mt-1 text-3xl font-bold">Platform Management</h1></div>
      <Card>
        <CardHeader><CardTitle>Conversion funnel (last {funnel.days} days)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-slate-500">Landing page visits</p><p className="text-2xl font-bold">{funnel.visits}</p></div>
          <div><p className="text-xs text-slate-500">New signups</p><p className="text-2xl font-bold">{funnel.signups}</p></div>
          <div><p className="text-xs text-slate-500">Conversion rate</p><p className="text-2xl font-bold">{funnel.conversionRate === null ? "—" : `${funnel.conversionRate}%`}</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
        <CardContent>
          <BrandingLogoForm initialLogoUrl={logoUrl} />
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Role</th></tr></thead><tbody className="divide-y dark:divide-slate-800">{users.map((user) => <tr key={user.id}><td className="px-5 py-4 font-semibold">{user.fullName}<p className="text-xs font-normal text-slate-500">{user.email}</p></td><td className="px-5 py-4">{formatDate(user.createdAt)}</td><td className="px-5 py-4"><Badge className={user.isActive ? "" : "bg-red-50 text-red-700"}>{user.isActive ? "Active" : "Inactive"}</Badge></td><td className="px-5 py-4"><PropertySelect endpoint={`/api/v1/users/${user.id}`} property="roleId" value={user.roleId} options={roleOptions} /></td></tr>)}</tbody></table>
        {users.length === 0 && <p className="p-10 text-center text-slate-500">Users appear after Supabase Auth registration.</p>}
      </CardContent></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Feed categories</CardTitle><ResourceCreateForm title="Add category" endpoint="/api/v1/categories" fields={[{ name: "name", label: "Name", required: true }, { name: "description", label: "Description", type: "textarea" }]} /></CardHeader><CardContent className="divide-y dark:divide-slate-800">{categories.map((category) => <div key={category.id} className="flex items-center justify-between py-3"><div><p className="font-medium">{category.name}</p><p className="text-xs text-slate-500">{category.slug}</p></div><Badge>{category._count.feedItems} items</Badge></div>)}</CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Settings</CardTitle><ResourceCreateForm title="Save setting" endpoint="/api/v1/settings" fields={[{ name: "key", label: "Key", required: true, placeholder: "organization.support_email" }, { name: "value", label: "Value", type: "textarea", required: true }, { name: "isPublic", label: "Public setting", type: "checkbox" }]} /></CardHeader><CardContent className="divide-y dark:divide-slate-800">{settings.map((setting) => <div key={setting.key} className="py-3"><div className="flex items-center gap-2"><p className="font-mono text-sm font-semibold">{setting.key}</p>{setting.isPublic && <Badge>Public</Badge>}</div><p className="mt-1 break-all text-sm text-slate-500">{String(setting.value)}</p></div>)}{settings.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No custom settings.</p>}</CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Learning feed</CardTitle><a href="/admin/feed" className="text-sm font-semibold text-teal-700 hover:underline">Manage feed items →</a></CardHeader><CardContent><p className="text-sm text-slate-500">Create, edit, publish, and delete Learning Feed posts, including link previews.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Learning paths</CardTitle><a href="/admin/learning-paths" className="text-sm font-semibold text-teal-700 hover:underline">Manage learning paths →</a></CardHeader><CardContent><p className="text-sm text-slate-500">Create structured learning journeys with feed items, required quizzes, and automatic certificates.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>AI Providers</CardTitle><a href="/admin/ai-providers" className="text-sm font-semibold text-teal-700 hover:underline">Manage AI providers →</a></CardHeader><CardContent><p className="text-sm text-slate-500">Configure and prioritize the API keys that power &ldquo;Generate with AI&rdquo; on the Feed page.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Placement Partners</CardTitle><a href="/admin/partners" className="text-sm font-semibold text-teal-700 hover:underline">Manage partners →</a></CardHeader><CardContent><p className="text-sm text-slate-500">Give other institutes a white-labeled, time-boxed link to your job board.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Course Benefits</CardTitle><a href="/admin/benefits" className="text-sm font-semibold text-teal-700 hover:underline">Manage benefits →</a></CardHeader><CardContent><p className="text-sm text-slate-500">Coupons, scholarships, and perks with their own expiry — map them onto specific course tiers/modes.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Content Sources</CardTitle><a href="/admin/content-sources" className="text-sm font-semibold text-teal-700 hover:underline">Manage sources →</a></CardHeader><CardContent><p className="text-sm text-slate-500">Poll MCG&apos;s YouTube, Instagram, and blog for recent posts to turn into feed items or learning-path content.</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Referral Commission Engine</CardTitle>
          <a href="/admin/referral-commissions" className="text-sm font-semibold text-teal-700 hover:underline">
            Open campaign builder →
          </a>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Configure flat, percentage, hybrid, installment, and milestone commission campaigns, approve rewards, process payouts, and run date-wise reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
