const bcrypt = require("bcrypt");
const { prisma } = require("../prisma");

function getLogin(req, res) {
  res.render("login", { error: null });
}

async function postLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("login", { error: "Completează email și parolă." });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).render("login", { error: "Email sau parolă greșite." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).render("login", { error: "Email sau parolă greșite." });
    }

    req.session.user = { id: user.id, email: user.email, role: user.role, name: user.name };

    console.log(`[AUTH] Login OK: ${user.email}`);
    return res.redirect("/dashboard");
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    return res.status(500).render("login", { error: "Eroare server la login." });
  }
}

function postLogout(req, res) {
  const email = req.session?.user?.email;

  req.session.destroy(() => {
    console.log(`[AUTH] Logout: ${email || "unknown"}`);
    res.redirect("/login");
  });
}

module.exports = { getLogin, postLogin, postLogout };
