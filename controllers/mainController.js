const prisma = require("../config/prisma");
exports.home = (req, res) => {
  res.render("index", {
    title: "Node.js CRM",
    message: "Structură MVC activă 🚀"
  });
};

exports.contactPage = (req, res) => {
  res.render("contact");
};
exports.contactSubmit = async (req, res) => {
  const { name } = req.body;

  try {
    await prisma.contact.create({
      data: { name }
    });

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("DB error");
  }
};

exports.dashboard = async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.render("dashboard", { contacts });
  } catch (error) {
    console.error(error);
    res.status(500).send("DB error");
  }
};
