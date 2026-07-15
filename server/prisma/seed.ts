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

  await prisma.blogPost.create({
    data: {
      slug: "meditation-video",
      locale: "he",
      title: "מדיטציה מודרכת בוידאו",
      excerpt: "סרטון מדיטציה מודרכת קצר לרגיעה ולנשימה מודעת",
      content: "<p>בפוסט זה תמצאו סרטון מדיטציה מודרכת קצר. שבו בנוחות, נשמו עמוק וצפו.</p>",
      videoUrl: "https://www.youtube.com/watch?v=inpok4MKVLM",
      publishedAt: new Date(),
    },
  });

  // Lectures
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setHours(19, 0, 0, 0);

  await prisma.lecture.create({
    data: {
      slug: "intro-meditation",
      locale: "he",
      type: "SCHEDULED",
      title: "מבוא למדיטציה",
      subtitle: "הרצאה ומדיטציה חווייתית",
      summary: "ערב פתוח על יסודות המדיטציה וטכניקות מעשיות לתחילת הדרך, עם תרגול קצר שאפשר לקחת הביתה.",
      description:
        "<p>הרצאה פתוחה על יסודות המדיטציה וטכניקות לתחילת הדרך. נלמד טכניקות בסיסיות שתוכלו ליישם בחיי היומיום.</p>",
      audience: "מתאים לכל מי שמבקש לעצור, לנשום ולהתחבר לעצמו — ללא צורך בניסיון קודם.",
      durationLabel: "90 דקות",
      highlights: [
        "נכיר את עקרונות המדיטציה בגובה העיניים.",
        "נתרגל מדיטציה קצרה שאפשר לקחת לחיי היום־יום.",
        "נסיים בזמן לשאלות, שיתוף וכלים להמשך.",
      ],
      date: nextMonth,
      location: "תל אביב",
      price: 80,
    },
  });

  await prisma.lecture.create({
    data: {
      slug: "calm-at-work",
      locale: "he",
      type: "ON_DEMAND",
      title: "שקט בתוך יום העבודה",
      subtitle: "הרצאה לארגונים ולקבוצות",
      summary: "מפגש פרקטי להפחתת עומס, חיזוק נוכחות ושיפור התקשורת בצוות. אתם בוחרים תאריך ומקום.",
      description:
        "<p>מפגש פרקטי להפחתת עומס וחיזוק נוכחות בעבודה. התוכן מותאם לאופי הקבוצה ולמטרות המפגש, ואפשר להזמין אותו כהרצאה עצמאית או כחלק מיום צוות.</p>",
      audience: "צוותים, ארגונים, קהילות וקבוצות פרטיות.",
      durationLabel: "60–90 דקות",
      highlights: [
        "התוכן מותאם לאופי הקבוצה ולמטרות המפגש.",
        "אפשר להזמין הרצאה עצמאית או כחלק מיום צוות.",
        "התאריך נקבע יחד לאחר בדיקת זמינות.",
      ],
      location: "אצלכם בארגון או אונליין",
      minimumParticipants: 10,
      sortOrder: 1,
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
