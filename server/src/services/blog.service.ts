import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";
import { prisma } from "../prisma.js";
import type { Prisma } from "@prisma/client";

export async function listPublishedPosts(
  locale: string,
  { page, limit, search }: PaginationParams & { search?: string },
) {
  const where: Prisma.BlogPostWhereInput = {
    locale,
    publishedAt: { not: null, lte: new Date() },
    deletedAt: null,
  };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ];
  }
  const [data, total] = await Promise.all([
    prisma.blogPost.findMany({
      where, orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, videoUrl: true, publishedAt: true },
      ...paginate({ page, limit }),
    }),
    prisma.blogPost.count({ where }),
  ]);
  return paginatedResponse(data, total, { page, limit });
}

export async function getPostBySlug(slug: string, locale: string) {
  return prisma.blogPost.findFirst({
    where: { slug, locale, publishedAt: { not: null }, deletedAt: null },
    include: {
      comments: {
        where: { isApproved: true },
        select: { id: true, authorName: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createPost(data: {
  slug: string; locale: string; title: string; excerpt?: string;
  content: string; imageUrl?: string; videoUrl?: string; publishedAt?: Date;
}) {
  return prisma.blogPost.create({ data });
}

export async function updatePost(id: number, data: Partial<{
  slug: string; title: string; excerpt: string; content: string; imageUrl: string | null; videoUrl: string | null; publishedAt: Date | null;
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
