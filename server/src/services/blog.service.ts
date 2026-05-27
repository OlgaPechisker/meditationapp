import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listPublishedPosts(locale: string, pagination: PaginationParams) {
  const where = { locale, publishedAt: { not: null }, deletedAt: null };
  const [data, total] = await Promise.all([
    prisma.blogPost.findMany({
      where, orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, publishedAt: true },
      ...paginate(pagination),
    }),
    prisma.blogPost.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function getPostBySlug(slug: string, locale: string) {
  return prisma.blogPost.findFirst({ where: { slug, locale, publishedAt: { not: null }, deletedAt: null } });
}

export async function createPost(data: {
  slug: string; locale: string; title: string; excerpt?: string;
  content: string; imageUrl?: string; publishedAt?: Date;
}) {
  return prisma.blogPost.create({ data });
}

export async function updatePost(id: number, data: Partial<{
  title: string; excerpt: string; content: string; imageUrl: string; publishedAt: Date | null;
}>) {
  return prisma.blogPost.update({ where: { id }, data });
}

export async function softDeletePost(id: number) {
  return prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function listAllPosts(locale: string, pagination: PaginationParams) {
  const where = { locale, deletedAt: null };
  const [data, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(pagination) }),
    prisma.blogPost.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
