import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listUpcomingLectures(locale: string, pagination: PaginationParams) {
  const where = { locale, isActive: true, date: { gte: new Date() } };
  const [data, total] = await Promise.all([
    prisma.lecture.findMany({ where, orderBy: { date: "asc" }, ...paginate(pagination) }),
    prisma.lecture.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function getLectureBySlug(slug: string, locale: string) {
  return prisma.lecture.findUnique({ where: { slug_locale: { slug, locale } } });
}

export async function createLecture(data: {
  slug: string; locale: string; title: string; description: string;
  date: Date; location?: string; price?: string; imageUrl?: string;
}) {
  return prisma.lecture.create({ data });
}

export async function updateLecture(id: number, data: Partial<{
  title: string; description: string; date: Date; location: string;
  price: string; imageUrl: string; isActive: boolean;
}>) {
  return prisma.lecture.update({ where: { id }, data });
}

export async function listAllLectures(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.lecture.findMany({ where, orderBy: { date: "desc" }, ...paginate(pagination) }),
    prisma.lecture.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
