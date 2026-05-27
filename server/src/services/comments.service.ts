import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listApprovedComments(postId: number, pagination: PaginationParams) {
  const where = { postId, isApproved: true };
  const [data, total] = await Promise.all([
    prisma.comment.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(pagination) }),
    prisma.comment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function createComment(data: { postId: number; authorName: string; content: string }) {
  return prisma.comment.create({ data });
}

export async function listPendingComments(pagination: PaginationParams) {
  const where = { isApproved: false };
  const [data, total] = await Promise.all([
    prisma.comment.findMany({ where, orderBy: { createdAt: "desc" }, include: { post: { select: { title: true } } }, ...paginate(pagination) }),
    prisma.comment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function approveComment(id: number) {
  return prisma.comment.update({ where: { id }, data: { isApproved: true } });
}

export async function deleteComment(id: number) {
  return prisma.comment.delete({ where: { id } });
}
