import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
        description: "טיפול ריפוי אנרגטי שמשלב טכניקות עתיקות עם גישה מודרנית. הטיפול מתמקד באיזון אנרגטי ושחרור חסמים רגשיים ופיזיים.",
        price: "₪350",
        sortOrder: 1,
      },
      {
        slug: "meditation",
        locale: "he",
        title: "מדיטציה",
        subtitle: "מדיטציה מודרכת",
        description: "מפגשי מדיטציה מודרכת לשלווה פנימית והתחדשות. התהליך כולל טכניקות נשימה, הדמיה מודרכת ומדיטציית מיינדפולנס.",
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
      content: "שמחה לבשר על השקת האתר החדש! כאן תמצאו מידע על טיפולים, הרצאות ועוד. אני מזמינה אתכם לעקוב אחרי הבלוג לקבלת תכנים חדשים.",
      publishedAt: new Date(),
    },
  });

  // Lectures
  await prisma.lecture.create({
    data: {
      slug: "intro-meditation",
      locale: "he",
      title: "מבוא למדיטציה",
      description: "הרצאה פתוחה על יסודות המדיטציה וטכניקות לתחילת הדרך. נלמד טכניקות בסיסיות שתוכלו ליישם בחיי היומיום.",
      date: new Date("2026-07-01T19:00:00"),
      location: "תל אביב",
      price: "₪80",
    },
  });

  // Songs
  await prisma.song.create({
    data: {
      locale: "he",
      title: "שיר לנשמה",
      lyrics: "מילים זורמות כמו מים\nנושאות אותי למקומות גבוהים\nהנשמה שרה את שירה\nואני מקשיבה.",
      sortOrder: 1,
    },
  });

  // Site content
  await prisma.siteContent.createMany({
    data: [
      {
        key: "about",
        locale: "he",
        value: "עינת שומונוב - מטפלת ומדריכת מדיטציה. מלווה אנשים בדרכם לריפוי ושלווה פנימית כבר למעלה מעשור. הגישה שלי משלבת טכניקות ריפוי מסורתיות עם כלים מודרניים.",
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
