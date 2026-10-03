import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { couponService } from "@/services/coupon.service";
import { CouponManager } from "@/components/admin/coupon-manager";

export default async function AdminCouponsPage() {
  await requireRole(["ADMIN"]);
  const [coupons, targetOptions] = await Promise.all([couponService.list(), couponService.targetOptions()]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">
          ← Administration
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Coupons</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Codes learners enter on a Buy button for money off at checkout. A coupon only works on the
          items you pick for it. A discount that covers the whole price unlocks the item without
          payment. Uses are counted once a purchase is paid.
        </p>
      </div>
      <CouponManager
        initialCoupons={JSON.parse(JSON.stringify(coupons))}
        targetOptions={targetOptions}
      />
    </div>
  );
}
