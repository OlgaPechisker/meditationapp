import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as lectureService from "../services/lectures.service.js";
import { richTextSchema } from "../utils/rich-text.js";
import { generateSlug } from "../utils/slug.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors/application-error.js";

export const lectureRoutes = Router();

lectureRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await lectureService.listUpcomingLectures(req.locale, pagination);
  res.json(result);
});

lectureRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await lectureService.listAllLectures(req.locale, pagination);
  res.json(result);
});

lectureRoutes.get("/:slug", async (req: Request, res: Response) => {
  const lecture = await lectureService.getLectureBySlug(req.params.slug as string, req.locale);
  if (!lecture) throw new NotFoundError();
  res.json(lecture);
});

// ---- Shared field schemas ----
const priceSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);
const imageUrlSchema = z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional());
const highlightsSchema = z.array(z.string().trim().min(1));
const optionalTextSchema = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().trim().min(1).optional(),
);
const optionalNullableTextSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().trim().min(1).nullable().optional(),
);

const sharedCreateFields = {
  slug: z.string().trim().optional(),
  locale: z.string().default("he"),
  title: z.string().trim().min(1),
  subtitle: optionalTextSchema,
  summary: optionalTextSchema,
  description: richTextSchema,
  audience: optionalTextSchema,
  durationLabel: optionalTextSchema,
  highlights: highlightsSchema.optional(),
  location: z.string().trim().min(1),
  price: priceSchema,
  imageUrl: imageUrlSchema,
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
};

const scheduledCreateSchema = z
  .object({
    type: z.literal("SCHEDULED"),
    date: z.coerce.date(),
    minimumParticipants: z.null().optional(),
    ...sharedCreateFields,
  })
  .strict();

const onDemandCreateSchema = z
  .object({
    type: z.literal("ON_DEMAND"),
    date: z.null().optional(),
    minimumParticipants: z.coerce.number().int().min(1),
    ...sharedCreateFields,
  })
  .strict();

const createSchema = z.discriminatedUnion("type", [scheduledCreateSchema, onDemandCreateSchema]);

const MAX_SLUG_CREATE_ATTEMPTS = 5;

function isSlugLocaleConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const prismaError = error as {
    code?: unknown;
    meta?: { modelName?: unknown; target?: unknown };
  };
  if (prismaError.code !== "P2002") {
    return false;
  }

  const target = prismaError.meta?.target;
  if (Array.isArray(target)) {
    const targetName = target.filter((field): field is string => typeof field === "string").join(",");
    return targetName.includes("slug") && targetName.includes("locale");
  }
  if (typeof target === "string") {
    return target.includes("slug") && target.includes("locale");
  }

  // The Prisma PostgreSQL adapter currently omits constraint fields from P2002
  // metadata. Lecture has only the slug/locale unique constraint.
  return prismaError.meta?.modelName === "Lecture";
}

lectureRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body);
  const data = {
    slug: input.slug && input.slug.length > 0 ? input.slug : generateSlug(input.title),
    locale: input.locale,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle ?? null,
    summary: input.summary ?? null,
    description: input.description,
    audience: input.audience ?? null,
    durationLabel: input.durationLabel ?? null,
    highlights: input.highlights ?? [],
    location: input.location,
    price: input.price ?? null,
    imageUrl: input.imageUrl ?? null,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
    date: input.type === "SCHEDULED" ? input.date : null,
    minimumParticipants: input.type === "ON_DEMAND" ? input.minimumParticipants : null,
  };

  for (let attempt = 0; attempt < MAX_SLUG_CREATE_ATTEMPTS; attempt++) {
    try {
      const lecture = await lectureService.createLecture(data);
      res.status(201).json(lecture);
      return;
    } catch (error) {
      if (!isSlugLocaleConflict(error)) throw error;
      if (attempt === MAX_SLUG_CREATE_ATTEMPTS - 1) {
        throw new ConflictError("Unable to generate a unique lecture slug");
      }
      data.slug = generateSlug(input.title);
    }
  }
});

// ---- PATCH ----
const patchSchema = z
  .object({
    slug: z.string().trim().min(1).optional(),
    type: z.enum(["SCHEDULED", "ON_DEMAND"]).optional(),
    title: z.string().trim().min(1).optional(),
    subtitle: optionalNullableTextSchema,
    summary: optionalNullableTextSchema,
    description: richTextSchema.optional(),
    audience: optionalNullableTextSchema,
    durationLabel: optionalNullableTextSchema,
    highlights: highlightsSchema.optional(),
    date: z.coerce.date().nullable().optional(),
    location: z.string().trim().min(1).optional(),
    price: z.preprocess(
      (v) => (v === "" ? null : v),
      z.coerce.number().int().min(0).nullable().optional(),
    ),
    minimumParticipants: z.coerce.number().int().min(1).nullable().optional(),
    imageUrl: z.preprocess((v) => (v === "" ? null : v), z.string().url().nullable().optional()),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .strict();

lectureRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");

  const patch = patchSchema.parse(req.body);

  const current = await lectureService.getLectureById(id);
  if (!current) throw new NotFoundError();

  const effectiveType = patch.type ?? current.type;
  const effectiveDate = patch.date !== undefined ? patch.date : current.date;
  const effectiveMinimum =
    patch.minimumParticipants !== undefined ? patch.minimumParticipants : current.minimumParticipants;

  // Validate the merged object against the type invariants.
  const fieldErrors: Record<string, string[]> = {};
  if (effectiveType === "SCHEDULED" && !effectiveDate) {
    fieldErrors.date = ["A date is required for scheduled lectures"];
  }
  if (effectiveType === "ON_DEMAND" && (effectiveMinimum == null || effectiveMinimum < 1)) {
    fieldErrors.minimumParticipants = ["On-demand lectures require a minimum of at least 1 participant"];
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Invalid lecture", { fields: fieldErrors });
  }

  // Build the update, clearing the field that is irrelevant to the effective type.
  const data: Record<string, unknown> = {};
  const assign = <K extends keyof typeof patch>(key: K) => {
    if (patch[key] !== undefined) data[key as string] = patch[key];
  };
  (["slug", "type", "title", "subtitle", "summary", "description", "audience",
    "durationLabel", "highlights", "location", "price", "imageUrl", "isActive", "sortOrder",
  ] as const).forEach(assign);

  if (effectiveType === "SCHEDULED") {
    data.date = effectiveDate;
    data.minimumParticipants = null;
  } else {
    data.date = null;
    data.minimumParticipants = effectiveMinimum;
  }

  const lecture = await lectureService.updateLecture(id, data);
  res.json(lecture);
});

lectureRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await lectureService.deleteLecture(id);
  res.status(204).end();
});
