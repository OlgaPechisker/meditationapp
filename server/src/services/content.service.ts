import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getContent(key: string, locale: string) {
  return prisma.siteContent.findUnique({ where: { key_locale: { key, locale } } });
}

export async function getAllContent(locale: string) {
  return prisma.siteContent.findMany({ where: { locale } });
}

export async function upsertContent(key: string, locale: string, value: string) {
  return prisma.siteContent.upsert({
    where: { key_locale: { key, locale } },
    update: { value },
    create: { key, locale, value },
  });
}
