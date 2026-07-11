import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../.env") });
loadEnv({ path: resolve(currentDir, "../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  // Clear existing data
  await prisma.comment.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.lecture.deleteMany();
  await prisma.song.deleteMany();
  await prisma.siteContent.deleteMany();

  // Treatments
  await prisma.treatment.createMany({
    data: [
      {
        slug: "healing",
        locale: "he",
        title: "ריפוי",
        subtitle: "טיפול אנרגטי",
        description: "<p>טיפול ריפוי אנרגטי שמשלב טכניקות עתיקות עם גישה מודרנית. הטיפול מתמקד באיזון אנרגטי ושחרור חסמים רגשיים ופיזיים.</p>",
        price: "₪350",
        sortOrder: 1,
      },
      {
        slug: "meditation",
        locale: "he",
        title: "מדיטציה",
        subtitle: "מדיטציה מודרכת",
        description: "<p>מפגשי מדיטציה מודרכת לשלווה פנימית והתחדשות. התהליך כולל טכניקות נשימה, הדמיה מודרכת ומדיטציית מיינדפולנס.</p>",
        price: "₪250",
        sortOrder: 2,
      },
    ],
  });

  // Blog posts
  await prisma.blogPost.create({
    data: {
      slug: "welcome",
      locale: "he",
      title: "ברוכים הבאים",
      excerpt: "פוסט ראשון בבלוג - שמחה לבשר על השקת האתר החדש",
      content: "<p>שמחה לבשר על השקת האתר החדש! כאן תמצאו מידע על טיפולים, הרצאות ועוד. אני מזמינה אתכם לעקוב אחרי הבלוג לקבלת תכנים חדשים.</p>",
      publishedAt: new Date(),
    },
  });

  // Lectures
  await prisma.lecture.create({
    data: {
      slug: "intro-meditation",
      locale: "he",
      title: "מבוא למדיטציה",
      description: "<p>הרצאה פתוחה על יסודות המדיטציה וטכניקות לתחילת הדרך. נלמד טכניקות בסיסיות שתוכלו ליישם בחיי היומיום.</p>",
      date: new Date("2026-07-01T19:00:00"),
      location: "תל אביב",
      price: "₪80",
    },
  });

  // Songs
  await prisma.song.create({
    data: {
      locale: "he",
      imageUrl: "https://placehold.co/400x600.png?text=Song+1",
      sortOrder: 1,
    },
  });

  // Site content
  await prisma.siteContent.createMany({
    data: [
      {
        key: "about_title",
        locale: "he",
        value: "אודות",
      },
      {
        key: "about",
        locale: "he",
        value: "<p>עינת שומונוב - מטפלת ומדריכת מדיטציה. מלווה אנשים בדרכם לריפוי ושלווה פנימית כבר למעלה מעשור. הגישה שלי משלבת טכניקות ריפוי מסורתיות עם כלים מודרניים.</p>",
      },
      {
        key: "about_image",
        locale: "he",
        value: "/assets/about.png",
      },
      {
        key: "contact_phone",
        locale: "he",
        value: "+972501234567",
      },
      {
        key: "contact_email",
        locale: "he",
        value: "einat@example.com",
      },
    ],
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
