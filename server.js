const app = require("./app");
const { port } = require("./config/env");
const { connectDB } = require("./config/prisma");
const logger = require("./config/logger");

async function startServer() {
  try {
    await connectDB();

    app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    logger.error("Server startup failed", error);
    process.exit(1);
  }
}

startServer();
