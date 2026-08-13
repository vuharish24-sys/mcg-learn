import { enumLabel } from "@/lib/utils";
import type { FormField } from "@/types/resource";

const feedTypes = [
  "ARTICLE",
  "YOUTUBE",
  "INSTAGRAM_REEL",
  "PDF",
  "QUIZ",
  "CAREER_TIP",
  "ANNOUNCEMENT",
  "WEBINAR",
  "ADVERTISEMENT",
  "SPONSORED",
  "INTERNAL_PROMOTION",
  "JOB_POSTING",
  "COURSE",
] as const;

export { feedTypes };

/**
 * Feed types AI generation can actually complete end-to-end. Excludes types
 * that need a real external asset (YouTube/Instagram video URL, a PDF file,
 * a scheduled webinar, a linked advertiser) — AI has no way to produce those,
 * so offering them just creates permanently-incomplete drafts.
 */
export const aiGeneratableFeedTypes = [
  "ARTICLE",
  "CAREER_TIP",
  "ANNOUNCEMENT",
  "INTERNAL_PROMOTION",
  "QUIZ",
] as const;

export function feedItemFormFields(
  categories: { id: string; name: string }[],
  partners: { id: string; name: string }[] = [],
): FormField[] {
  return [
    { name: "title", label: "Title", required: true },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      required: true,
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "description", label: "Description", type: "textarea", required: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: feedTypes.map((value) => ({ value, label: enumLabel(value) })),
    },
    { name: "externalUrl", label: "External URL", type: "url" },
    {
      name: "thumbnailUrl",
      label: "Thumbnail (upload or URL)",
      type: "url",
      allowUpload: true,
      uploadFolder: "feed",
    },
    {
      name: "postedByPartnerId",
      label: "Exclusive to partner (optional)",
      type: "select",
      options: [
        { value: "", label: "Global — visible to all partners & the main feed" },
        ...partners.map((p) => ({ value: p.id, label: p.name })),
      ],
      showWhen: { field: "type", in: ["JOB_POSTING"] },
    },
    {
      name: "content",
      label: "Content JSON (quiz/webinar)",
      type: "textarea",
      placeholder:
        'Quiz: {"questions":[{"question":"...","options":["A","B"],"answer":0}]}\n' +
        'Webinar: {"webinarAt":"2026-12-31T18:00:00","location":"Zoom link or venue"}',
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "DRAFT",
      options: ["DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => ({
        value,
        label: enumLabel(value),
      })),
    },
    { name: "priority", label: "Priority", type: "number", defaultValue: "0" },
    { name: "isFeatured", label: "Featured", type: "checkbox" },
    {
      name: "placements",
      label: "Also show on",
      type: "multiselect",
      defaultValue: "FEED",
      options: [
        { value: "FEED", label: "Main feed" },
        { value: "LEARNING_PATH_LIST", label: "Learning paths list" },
      ],
      showWhen: { field: "type", in: ["ADVERTISEMENT", "SPONSORED", "INTERNAL_PROMOTION"] },
    },
  ];
}

export function feedItemInitialValues(item: {
  title: string;
  description: string;
  categoryId: string;
  type: string;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  content: unknown;
  status: string;
  priority: number;
  isFeatured: boolean;
  placements?: string[];
  postedByPartnerId?: string | null;
}) {
  return {
    title: item.title,
    description: item.description,
    categoryId: item.categoryId,
    type: item.type,
    externalUrl: item.externalUrl ?? "",
    thumbnailUrl: item.thumbnailUrl ?? "",
    postedByPartnerId: item.postedByPartnerId ?? "",
    content:
      item.content == null
        ? ""
        : typeof item.content === "string"
          ? item.content
          : JSON.stringify(item.content, null, 2),
    status: item.status,
    priority: String(item.priority),
    isFeatured: item.isFeatured,
    placements: item.placements ?? ["FEED"],
  };
}
