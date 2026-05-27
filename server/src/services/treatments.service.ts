import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listTreatments(locale: string, pagination: PaginationParams) {
  const where = { locale, isActive: true };
  const [data, total] = await Promise.all([
    prisma.treatment.findMany({ where, orderBy: { sortOrder: "asc" }, ...paginate(pagination) }),
    prisma.treatment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function getTreatmentBySlug(slug: string, locale: string) {
  return prisma.treatment.findUnique({ where: { slug_locale: { slug, locale } } });
}

export async function createTreatment(data: {
  slug: string; locale: string; title: string; subtitle?: string;
  description: string; price?: string; imageUrl?: string; sortOrder?: number;
}) {
  return prisma.treatment.create({ data });
}

export async function updateTreatment(id: number, data: Partial<{
  title: string; subtitle: string; description: string; price: string;
  imageUrl: string; sortOrder: number; isActive: boolean;
}>) {
  return prisma.treatment.update({ where: { id }, data });
}

export async function listAllTreatments(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.treatment.findMany({ where, orderBy: { sortOrder: "asc" }, ...paginate(pagination) }),
    prisma.treatment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
