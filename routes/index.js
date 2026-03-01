router.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      db: "connected",
      time: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      db: "disconnected"
    });
  }
});
