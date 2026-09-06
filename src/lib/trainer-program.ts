export const COMPENSATION_TYPE_LABEL: Record<string, string> = {
  HOURLY: "Hourly (₹/hour)",
  FLAT_PER_SESSION: "Flat per session",
  FLAT_PER_DELIVERABLE: "Flat per deliverable",
  PER_STUDENT_USE: "Per student use (₹/student)",
};

export function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
