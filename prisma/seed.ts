import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const salons = [
  { handle: "lumi.hair", displayName: "Lumi Hair Studio", salonName: "Lumi Hair Studio", city: "Hà Nội", hue: 330, bio: "Nhuộm · Uốn · Phục hồi tóc ✨", bookingUrl: "https://example.com/lumi" },
  { handle: "nail.house", displayName: "The Nail House", salonName: "The Nail House", city: "TP. Hồ Chí Minh", hue: 20, bio: "Nail art theo yêu cầu 💅", phone: "0900 000 111" },
  { handle: "serene.spa", displayName: "Serene Spa", salonName: "Serene Spa & Beauty", city: "Đà Nẵng", hue: 170, bio: "Chăm sóc da & thư giãn", bookingUrl: "https://example.com/serene" },
];

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 10);
  const users = [];
  for (const s of salons) {
    users.push(
      await db.user.upsert({
        where: { handle: s.handle },
        update: {},
        create: { email: `${s.handle.replace(".", "-")}@demo.test`, passwordHash, isSalon: true, phone: "", ...s },
      }),
    );
  }
  await db.user.upsert({
    where: { handle: "khach.demo" },
    update: {},
    create: { email: "khach@demo.test", passwordHash, handle: "khach.demo", displayName: "Khách Demo", hue: 210 },
  });

  console.log("Seeded demo accounts (no videos: upload real ones from /upload). Logins (password demo12345): lumi-hair@demo.test (salon), khach@demo.test (viewer)");
}

main().finally(() => db.$disconnect());
