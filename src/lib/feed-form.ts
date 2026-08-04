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
] as const;

export { feedTypes };

export function feedItemFormFields(
  categories: { id: string; name: string }[],
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
      name: "content",
      label: "Content JSON (quiz/webinar)",
      type: "textarea",
      placeholder: '{"questions":[{"question":"...","options":["A","B"],"answer":0}]}',
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
}) {
  return {
    title: item.title,
    description: item.description,
    categoryId: item.categoryId,
    type: item.type,
    externalUrl: item.externalUrl ?? "",
    thumbnailUrl: item.thumbnailUrl ?? "",
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
