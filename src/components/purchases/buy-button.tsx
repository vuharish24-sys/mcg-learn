"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load the payment widget. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

export function BuyButton({
  purchasableType,
  id,
  label,
  learner,
}: {
  purchasableType:
    | "LEARNING_PATH"
    | "LEARNING_PATH_MODULE"
    | "LEARNING_PATH_ITEM"
    | "BUNDLE"
    | "TUTOR_LMS_COURSE"
    | "PRACTICE_LAB_EXAM"
    | "TUTOR_SESSION"
    | "INSTALLMENT";
  id: string;
  label: string;
  learner: { fullName: string; email: string; phone: string | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Installments and tutor sessions are individually priced; coupons never apply to them.
  const couponsAllowed = purchasableType !== "INSTALLMENT" && purchasableType !== "TUTOR_SESSION";
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applying, setApplying] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; originalAmountPaise: number; discountPaise: number; finalAmountPaise: number } | null>(null);

  // Only the latest Apply wins, so a slow earlier check can't overwrite it.
  const latestApply = useRef(0);

  async function applyCoupon() {
    const attempt = ++latestApply.current;
    setApplying(true);
    setCouponError("");
    try {
      const res = await fetch("/api/v1/purchases/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchasableType, id, code: couponInput }),
      });
      const payload = await res.json();
      if (attempt !== latestApply.current) return;
      if (!res.ok) throw new Error(payload.error?.message ?? "That coupon can't be used");
      setCouponError("");
      setCoupon(payload.data);
    } catch (e) {
      if (attempt !== latestApply.current) return;
      setCoupon(null);
      setCouponError(e instanceof Error ? e.message : "That coupon can't be used");
    } finally {
      if (attempt === latestApply.current) setApplying(false);
    }
  }

  async function buy() {
    setLoading(true);
    setError("");
    try {
      const checkoutRes = await fetch("/api/v1/purchases/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchasableType, id, couponCode: coupon?.code ?? null }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkout.error?.message ?? "Unable to start checkout");
      if (checkout.data.free) {
        // Fully covered by the coupon: already paid and unlocked server-side.
        router.refresh();
        return;
      }
      if (!checkout.data.keyId) throw new Error("Payments are not configured yet — contact the site admin.");

      await loadCheckoutScript();

      const razorpay = new window.Razorpay({
        key: checkout.data.keyId,
        amount: checkout.data.amount,
        currency: checkout.data.currency,
        order_id: checkout.data.orderId,
        name: "MCG Learn",
        description: label,
        prefill: { name: learner.fullName, email: learner.email, contact: learner.phone ?? undefined },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/v1/purchases/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (!verifyRes.ok) {
            setError("Payment succeeded but confirmation failed — contact support with your payment ID.");
            return;
          }
          router.refresh();
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      razorpay.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start checkout");
      setLoading(false);
    }
  }

  const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const buttonLabel = coupon
    ? coupon.finalAmountPaise === 0
      ? "Get it free"
      : `Pay ${rupees(coupon.finalAmountPaise)}`
    : label;

  return (
    <div className="space-y-2">
      {coupon && (
        <p className="text-sm text-teal-800 dark:text-teal-200">
          Coupon <span className="font-mono font-semibold">{coupon.code}</span>: {rupees(coupon.discountPaise)} off{" "}
          <span className="text-slate-400 line-through">{rupees(coupon.originalAmountPaise)}</span>{" "}
          <button
            type="button"
            className="ml-1 text-xs text-slate-500 underline"
            onClick={() => {
              setCoupon(null);
              setCouponInput("");
            }}
          >
            Remove
          </button>
        </p>
      )}
      <Button variant="gradient" disabled={loading} onClick={buy}>
        {loading ? (coupon?.finalAmountPaise === 0 ? "Unlocking…" : "Opening checkout…") : buttonLabel}
      </Button>
      {couponsAllowed && !coupon && (
        couponOpen ? (
          <div className="flex max-w-xs items-center gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && couponInput.trim() && !applying) void applyCoupon();
              }}
              placeholder="Coupon code"
              autoCapitalize="characters"
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm uppercase dark:border-slate-700 dark:bg-slate-950"
            />
            <Button type="button" size="sm" variant="outline" disabled={applying || !couponInput.trim()} onClick={applyCoupon}>
              {applying ? "…" : "Apply"}
            </Button>
          </div>
        ) : (
          <button type="button" className="block text-xs text-teal-700 underline" onClick={() => setCouponOpen(true)}>
            Have a coupon?
          </button>
        )
      )}
      {couponError && <p className="text-sm text-red-600">{couponError}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
