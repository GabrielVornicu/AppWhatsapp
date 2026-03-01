const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function connectDB() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error("❌ Database connection failed", error);
    process.exit(1);
  }
}

module.exports = { prisma, connectDB };
