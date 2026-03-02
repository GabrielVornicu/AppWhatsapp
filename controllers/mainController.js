exports.home = (req, res) => {
  res.render("index", {
    title: "Node.js CRM",
    message: "Structură MVC activă 🚀"
  });
};

exports.dashboard = (req, res) => {
  res.render("index", {
    title: "Dashboard",
    message: "Aceasta este ruta /dashboard"
  });
};

exports.contactPage = (req, res) => {
  res.render("contact");
};

exports.contactSubmit = (req, res) => {
  const { name } = req.body;

  console.log("Form submitted:", name);

  res.redirect("/dashboard");
};
