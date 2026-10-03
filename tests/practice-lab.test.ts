import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import { probePracticeLab, verifyPracticeLabWebhook, type PracticeLabAttempt } from "@/lib/practice-lab";
import { attemptCompletes } from "@/services/practice-lab.service";

const attempt = (o: Partial<PracticeLabAttempt>): PracticeLabAttempt => ({
  id: "a", exam: null, program: "CPC", mode: "practice", status: "graded", counted_pct: 50, passed: null, ...o,
});
const drill = { grantKind: "program_practice", examId: null, programCode: "CPC" };
const exam = { grantKind: "exam", examId: "EXAM1", programCode: null };

test("drill mapping matches program drills only", () => {
  assert.equal(attemptCompletes(attempt({}), drill, "ON_FINISH", null), true);
  assert.equal(attemptCompletes(attempt({ program: "CCS" }), drill, "ON_FINISH", null), false);
  assert.equal(attemptCompletes(attempt({ exam: { id: "EXAM1", name: "x" } }), drill, "ON_FINISH", null), false);
});

test("exam mapping matches its own exam id only", () => {
  assert.equal(attemptCompletes(attempt({ exam: { id: "EXAM1", name: "x" }, passed: true }), exam, "ON_PASS", null), true);
  assert.equal(attemptCompletes(attempt({ exam: { id: "OTHER", name: "x" }, passed: true }), exam, "ON_PASS", null), false);
});

test("only graded attempts count", () => {
  for (const status of ["in_progress", "submitted", "abandoned", "expired"] as const) {
    assert.equal(attemptCompletes(attempt({ status }), drill, "ON_FINISH", null), false, status);
  }
});

test("on-pass uses the lesson's pass % when set, else the Lab's verdict", () => {
  assert.equal(attemptCompletes(attempt({ counted_pct: 55 }), drill, "ON_PASS", 60), false);
  assert.equal(attemptCompletes(attempt({ counted_pct: 72 }), drill, "ON_PASS", 60), true);
  // A drill has no verdict (passed: null), so on-pass without a pass % never completes.
  assert.equal(attemptCompletes(attempt({ counted_pct: 99 }), drill, "ON_PASS", null), false);
  assert.equal(attemptCompletes(attempt({ exam: { id: "EXAM1", name: "x" }, passed: false }), exam, "ON_PASS", null), false);
});

test("webhook signature: timestamp.body, 5-minute window", async () => {
  process.env.PRACTICE_LAB_WEBHOOK_SECRET = "unit-test-secret";
  const body = '{"attempt":{}}';
  const now = Math.floor(Date.now() / 1000).toString();
  const sign = (ts: string) => createHmac("sha256", "unit-test-secret").update(`${ts}.${body}`).digest("hex");
  assert.equal(await verifyPracticeLabWebhook(body, now, sign(now)), true);
  assert.equal(await verifyPracticeLabWebhook(body + " ", now, sign(now)), false);
  assert.equal(await verifyPracticeLabWebhook(body, now, "00".repeat(32)), false);
  const old = (Math.floor(Date.now() / 1000) - 600).toString();
  assert.equal(await verifyPracticeLabWebhook(body, old, sign(old)), false);
  assert.equal(await verifyPracticeLabWebhook(body, now, null), false);
});

test("API requests sign the full path including /api/v1 (regression)", async () => {
  process.env.PRACTICE_LAB_BASE_URL = "https://lab.example.test/api/v1/";
  process.env.PRACTICE_LAB_API_KEY_ID = "kid";
  process.env.PRACTICE_LAB_API_SECRET = "unit-secret";
  const realFetch = globalThis.fetch;
  let seen: { url: string; headers: Record<string, string> } | null = null;
  globalThis.fetch = (async (url: URL | string, init?: RequestInit) => {
    seen = { url: String(url), headers: init?.headers as Record<string, string> };
    return new Response(JSON.stringify({ title: "Not found" }), { status: 404 });
  }) as typeof fetch;
  try {
    const result = await probePracticeLab();
    assert.equal(result.ok, true, "404 for the probe learner means the key was accepted");
    assert.ok(seen);
    const { url, headers } = seen as { url: string; headers: Record<string, string> };
    assert.equal(url, "https://lab.example.test/api/v1/institute/learners/mcglearn-connection-test");
    const emptyHash = createHash("sha256").update("").digest("hex");
    const expected = createHmac("sha256", "unit-secret")
      .update(`GET\n/api/v1/institute/learners/mcglearn-connection-test\n${headers["X-Api-Timestamp"]}\n${headers["X-Api-Nonce"]}\n${emptyHash}`)
      .digest("hex");
    assert.equal(headers["X-Api-Signature"], expected);
    assert.match(headers["X-Api-Nonce"], /^[0-9a-f]{32}$/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
