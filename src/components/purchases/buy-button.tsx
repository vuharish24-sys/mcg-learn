"use client";

import { useState } from "react";
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
    | "TUTOR_SESSION"
    | "INSTALLMENT";
  id: string;
  label: string;
  learner: { fullName: string; email: string; phone: string | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setLoading(true);
    setError("");
    try {
      const checkoutRes = await fetch("/api/v1/purchases/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchasableType, id }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkout.error?.message ?? "Unable to start checkout");
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

  return (
    <div className="space-y-2">
      <Button variant="gradient" disabled={loading} onClick={buy}>
        {loading ? "Opening checkout…" : label}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
