import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";
import { prisma } from "../prisma.js";
import { SITE_CONTENT_KEYS, type SiteContentKey } from "../utils/site-content.js";

export async function getContent(key: SiteContentKey, locale: string) {
  return prisma.siteContent.findUnique({ where: { key_locale: { key, locale } } });
}

export async function getAllContent(locale: string) {
  return prisma.siteContent.findMany({ where: { locale, key: { in: [...SITE_CONTENT_KEYS] } } });
}

export async function getAllContentPaginated(locale: string, pagination: PaginationParams) {
  const where = { locale, key: { in: [...SITE_CONTENT_KEYS] } };
  const [data, total] = await Promise.all([
    prisma.siteContent.findMany({ where, ...paginate(pagination) }),
    prisma.siteContent.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function upsertContent(key: SiteContentKey, locale: string, value: string) {
  return prisma.siteContent.upsert({
    where: { key_locale: { key, locale } },
    update: { value },
    create: { key, locale, value },
  });
}
