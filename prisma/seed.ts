import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@sms.demo" },
    update: {},
    create: { name: "Amira Rahman", email: "admin@sms.demo", role: "REGISTRY_ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "staff@sms.demo" },
    update: {},
    create: { name: "Daniel Okoye", email: "staff@sms.demo", role: "STAFF" },
  });

  const programmes = [
    {
      code: "BSC-CS",
      name: "BSc Computer Science",
      baseFee: 900000,
      modules: [
        { code: "CS101", name: "Introduction to Programming" },
        { code: "CS102", name: "Databases" },
      ],
    },
    {
      code: "BA-BUS",
      name: "BA Business Management",
      baseFee: 850000,
      modules: [
        { code: "BUS101", name: "Principles of Management" },
        { code: "BUS102", name: "Marketing Fundamentals" },
      ],
    },
  ];

  for (const { modules, ...data } of programmes) {
    const programme = await prisma.programme.upsert({
      where: { code: data.code },
      update: {},
      create: data,
    });
    for (const m of modules) {
      await prisma.module.upsert({
        where: { code: m.code },
        update: {},
        create: { ...m, programmeId: programme.id },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
