import assert from "node:assert/strict";
import { test } from "node:test";
import { couponDiscountPaise, normalizeCouponCode } from "@/services/coupon.service";

test("codes are normalised to trimmed uppercase", () => {
  assert.equal(normalizeCouponCode("  cpc500 "), "CPC500");
});

test("flat discount is paise off, never more than the price", () => {
  assert.equal(couponDiscountPaise({ discountType: "FLAT", discountValue: 10000, maxDiscountPaise: null }, 50000), 10000);
  assert.equal(couponDiscountPaise({ discountType: "FLAT", discountValue: 90000, maxDiscountPaise: null }, 50000), 50000);
});

test("percent discount rounds down and respects the cap", () => {
  assert.equal(couponDiscountPaise({ discountType: "PERCENT", discountValue: 20, maxDiscountPaise: null }, 50000), 10000);
  assert.equal(couponDiscountPaise({ discountType: "PERCENT", discountValue: 20, maxDiscountPaise: 5000 }, 50000), 5000);
  assert.equal(couponDiscountPaise({ discountType: "PERCENT", discountValue: 33, maxDiscountPaise: null }, 999), 329);
  assert.equal(couponDiscountPaise({ discountType: "PERCENT", discountValue: 100, maxDiscountPaise: null }, 50000), 50000);
});
