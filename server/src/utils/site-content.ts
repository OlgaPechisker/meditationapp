import { z } from "zod";
import { validateRichText } from "./rich-text.js";
import {
  boundedPlainTextSchema,
  siteAssetUrlSchema,
} from "./content-contracts.js";

export const SITE_CONTENT_KEYS = [
  "about",
  "about_title",
  "about_image",
  "contact_phone",
  "contact_email",
] as const;

export const siteContentKeySchema = z.enum(SITE_CONTENT_KEYS);

export type SiteContentKey = z.infer<typeof siteContentKeySchema>;

type SiteContentContract = {
  classification: "rich-html" | "plain-text" | "url";
  validate: (value: string) => string;
};

const contactEmailSchema = boundedPlainTextSchema(320, { trim: true }).refine(
  (value) => z.email().safeParse(value).success,
  "Must be a valid email address",
);
const aboutTitleSchema = boundedPlainTextSchema(200, { trim: true });
const contactPhoneSchema = boundedPlainTextSchema(50, { trim: true });

export const SITE_CONTENT_CONTRACTS = {
  about: {
    classification: "rich-html",
    validate: validateRichText,
  },
  about_title: {
    classification: "plain-text",
    validate: (value) => aboutTitleSchema.parse(value),
  },
  about_image: {
    classification: "url",
    validate: (value) => siteAssetUrlSchema.parse(value),
  },
  contact_phone: {
    classification: "plain-text",
    validate: (value) => contactPhoneSchema.parse(value),
  },
  contact_email: {
    classification: "plain-text",
    validate: (value) => contactEmailSchema.parse(value),
  },
} as const satisfies Record<SiteContentKey, SiteContentContract>;

export function validateSiteContentValue(key: SiteContentKey, value: string): string {
  return SITE_CONTENT_CONTRACTS[key].validate(value);
}
