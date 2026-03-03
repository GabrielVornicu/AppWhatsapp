const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { prisma } = require("../prisma");
const { encrypt, decrypt } = require("../config/crypto");

async function getNewMarketplace(req, res) {
  res.render("marketplace-new", { error: null });
}

async function postMarketplace(req, res) {
  try {
    const { name, baseUrl, wpUsername, wpAppPassword } = req.body;

    if (!name || !baseUrl || !wpUsername || !wpAppPassword) {
      return res.render("marketplace-new", {
        error: "Completează toate câmpurile.",
      });
    }

    const cleanUrl = baseUrl.replace(/\/$/, "");

    // 🔥 TEST CONNECTION
    const basicAuth = Buffer.from(
      `${wpUsername}:${wpAppPassword}`
    ).toString("base64");

    const response = await fetch(
      `${cleanUrl}/wp-json/wp/v2/users/me`,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    if (!response.ok) {
      return res.render("marketplace-new", {
        error: "Conexiune WordPress eșuată. Verifică datele.",
      });
    }

    const encryptedPassword = encrypt(wpAppPassword);

    await prisma.marketplace.create({
      data: {
        name,
        baseUrl: cleanUrl,
        wpUsername,
        wpAppPasswordEnc: encryptedPassword,
        createdById: req.session.user.id,
      },
    });

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Marketplace error:", err);
    return res.render("marketplace-new", {
      error: "Eroare server la salvare.",
    });
  }
}

module.exports = {
  getNewMarketplace,
  postMarketplace,
};
