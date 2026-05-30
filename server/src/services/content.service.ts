import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function getContent(key: string, locale: string) {
  return prisma.siteContent.findUnique({ where: { key_locale: { key, locale } } });
}

export async function getAllContent(locale: string) {
  return prisma.siteContent.findMany({ where: { locale } });
}

export async function getAllContentPaginated(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.siteContent.findMany({ where, ...paginate(pagination) }),
    prisma.siteContent.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function upsertContent(key: string, locale: string, value: string) {
  return prisma.siteContent.upsert({
    where: { key_locale: { key, locale } },
    update: { value },
    create: { key, locale, value },
  });
}
