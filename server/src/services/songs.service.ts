import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listSongs(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.song.findMany({ where, orderBy: { sortOrder: "asc" }, ...paginate(pagination) }),
    prisma.song.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function createSong(data: { locale: string; title: string; lyrics: string; sortOrder?: number }) {
  return prisma.song.create({ data });
}

export async function updateSong(id: number, data: Partial<{ title: string; lyrics: string; sortOrder: number }>) {
  return prisma.song.update({ where: { id }, data });
}

export async function deleteSong(id: number) {
  return prisma.song.delete({ where: { id } });
}
