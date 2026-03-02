const { prisma } = require("../prisma");

async function getDashboard(req, res) {
  const user = req.session.user;

  const marketplaces = await prisma.marketplace.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
  });

  res.render("dashboard", { user, marketplaces });
}

module.exports = { getDashboard };
