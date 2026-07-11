import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateRichText } from "../src/utils/rich-text.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../.env") });
loadEnv({ path: resolve(currentDir, "../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to migrate rich text");
}

const applyChanges = process.argv.includes("--apply");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function migrate() {
  const [posts, treatments, lectures, aboutEntries] = await Promise.all([
    prisma.blogPost.findMany({ select: { id: true, content: true } }),
    prisma.treatment.findMany({ select: { id: true, description: true } }),
    prisma.lecture.findMany({ select: { id: true, description: true } }),
    prisma.siteContent.findMany({ where: { key: "about" }, select: { id: true, value: true } }),
  ]);

  const changes = [
    ...posts.map((record) => ({ type: "blog", id: record.id, before: record.content, after: migrateRichText(record.content) })),
    ...treatments.map((record) => ({ type: "treatment", id: record.id, before: record.description, after: migrateRichText(record.description) })),
    ...lectures.map((record) => ({ type: "lecture", id: record.id, before: record.description, after: migrateRichText(record.description) })),
    ...aboutEntries.map((record) => ({ type: "about", id: record.id, before: record.value, after: migrateRichText(record.value) })),
  ].filter((change) => change.before !== change.after);

  console.log(`${changes.length} rich-text records would change.`);
  for (const change of changes) {
    console.log(`${change.type}#${change.id}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`);
  }

  if (!applyChanges || changes.length === 0) {
    console.log(applyChanges ? "No changes applied." : "Dry run only. Re-run with --apply after backing up the reported records.");
    return;
  }

  await prisma.$transaction(changes.map((change) => {
    if (change.type === "blog") return prisma.blogPost.update({ where: { id: change.id }, data: { content: change.after } });
    if (change.type === "treatment") return prisma.treatment.update({ where: { id: change.id }, data: { description: change.after } });
    if (change.type === "lecture") return prisma.lecture.update({ where: { id: change.id }, data: { description: change.after } });
    return prisma.siteContent.update({ where: { id: change.id }, data: { value: change.after } });
  }));
  console.log(`Applied ${changes.length} rich-text updates.`);
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
