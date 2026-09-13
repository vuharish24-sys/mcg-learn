import { requireUser } from "@/lib/auth";
import { bundleItemLabel, bundleService } from "@/services/bundle.service";
import { purchaseService } from "@/services/purchase.service";
import { BuyButton } from "@/components/purchases/buy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BundlesPage() {
  const user = await requireUser();
  const [bundles, myPurchases] = await Promise.all([
    bundleService.listActive(),
    purchaseService.listMyPurchases(user.id),
  ]);
  const ownedBundleIds = new Set(myPurchases.filter((p) => p.bundleId).map((p) => p.bundleId));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">Save more</p>
        <h1 className="mt-1 text-3xl font-bold">Bundles</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Several learning paths, one combined price.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {bundles.map((bundle) => {
          const owned = ownedBundleIds.has(bundle.id);
          return (
            <Card key={bundle.id}>
              <CardHeader>
                <CardTitle>{bundle.title}</CardTitle>
                <p className="text-sm font-normal text-slate-500">{bundle.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {bundle.items.map((item) => (
                    <Badge key={item.id} className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                      {bundleItemLabel(item)}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-teal-700 dark:text-teal-400">
                    ₹{(bundle.priceInPaise / 100).toLocaleString("en-IN")}
                  </p>
                  {owned ? (
                    <Badge className="border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                      Owned
                    </Badge>
                  ) : (
                    <BuyButton
                      purchasableType="BUNDLE"
                      id={bundle.id}
                      label="Buy bundle"
                      learner={{ fullName: user.fullName, email: user.email, phone: user.phone }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {bundles.length === 0 && (
        <Card><CardContent className="p-12 text-center text-slate-500">No bundles available right now.</CardContent></Card>
      )}
    </div>
  );
}
