export type FormOption = { value: string; label: string };

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "number" | "date" | "datetime-local" | "textarea" | "select" | "checkbox" | "csv" | "multiselect";
  placeholder?: string;
  required?: boolean;
  options?: FormOption[];
  defaultValue?: string;
  /** When true on url fields, show file upload + URL paste */
  allowUpload?: boolean;
  uploadFolder?: "referral-campaigns" | "referral-payments" | "feed" | "general";
  /** Only render this field while the named field (currently only "type" is supported) has one of these values. */
  showWhen?: { field: "type"; in: string[] };
};
