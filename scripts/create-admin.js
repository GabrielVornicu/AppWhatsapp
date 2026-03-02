require("dotenv").config();
const bcrypt = require("bcrypt");
const { prisma } = require("../prisma");

async function main() {
  const email = process.argv[2];
  const pass = process.argv[3];

  if (!email || !pass) {
    console.log("Usage: node scripts/create-admin.js email parola");
    process.exit(1);
  }

  const hash = await bcrypt.hash(pass, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, role: "ADMIN" },
    create: { email, passwordHash: hash, role: "ADMIN", name: "Admin" },
  });

  console.log("Admin ready:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
