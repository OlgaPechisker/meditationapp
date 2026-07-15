import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";
import { prisma } from "../prisma.js";
import type { Prisma } from "@prisma/client";

type LectureCreateInput = Omit<Prisma.LectureUncheckedCreateInput, "id" | "createdAt" | "updatedAt">;
type LectureUpdateInput = Prisma.LectureUncheckedUpdateInput;

/**
 * Public list: active on-demand lectures plus active scheduled lectures whose
 * date is still in the future. Past scheduled lectures are hidden.
 *
 * Ordering is deterministic even though `date` is nullable: Postgres sorts
 * NULLs last for ASC, so scheduled lectures come first in chronological order,
 * followed by on-demand lectures ordered by sortOrder then title.
 */
export async function listUpcomingLectures(locale: string, pagination: PaginationParams) {
  const where: Prisma.LectureWhereInput = {
    locale,
    isActive: true,
    OR: [
      { type: "ON_DEMAND" },
      { type: "SCHEDULED", date: { gte: new Date() } },
    ],
  };
  const [data, total] = await Promise.all([
    prisma.lecture.findMany({
      where,
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      ...paginate(pagination),
    }),
    prisma.lecture.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

/**
 * Public single-lecture lookup. Returns null for inactive, missing, or past
 * scheduled lectures so hidden events cannot be reached via stale public links.
 */
export async function getLectureBySlug(slug: string, locale: string) {
  return prisma.lecture.findFirst({
    where: {
      slug,
      locale,
      isActive: true,
      OR: [
        { type: "ON_DEMAND" },
        { type: "SCHEDULED", date: { gte: new Date() } },
      ],
    },
  });
}

export async function getLectureById(id: number) {
  return prisma.lecture.findUnique({ where: { id } });
}

export async function createLecture(data: LectureCreateInput) {
  return prisma.lecture.create({ data });
}

export async function updateLecture(id: number, data: LectureUpdateInput) {
  return prisma.lecture.update({ where: { id }, data });
}

export async function deleteLecture(id: number) {
  return prisma.lecture.delete({ where: { id } });
}

export async function listAllLectures(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.lecture.findMany({
      where,
      orderBy: [{ date: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      ...paginate(pagination),
    }),
    prisma.lecture.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
