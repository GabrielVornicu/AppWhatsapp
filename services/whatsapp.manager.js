const path = require("path");
const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// cache în memorie: marketplaceId -> { client, lastQrDataUrl }
const sessions = new Map();

function normalizeE164(phone) {
  // aici o să păstrăm simplu: scoate spații, +, etc.
  // IMPORTANT: whatsapp-web.js vrea numărul fără + în format: 40xxxxxxxxx
  return String(phone || "").replace(/[^\d]/g, "");
}

async function setMarketplaceStatus(marketplaceId, patch) {
  await prisma.marketplace.update({
    where: { id: marketplaceId },
    data: patch,
  });
}

async function ensureClient(marketplaceId) {
  if (sessions.has(marketplaceId)) return sessions.get(marketplaceId);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `mp_${marketplaceId}`,
      dataPath: path.join(process.cwd(), ".wwebjs_auth"),
    }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });

  const state = { client, lastQrDataUrl: null };
  sessions.set(marketplaceId, state);

  client.on("qr", async (qr) => {
    const dataUrl = await qrcode.toDataURL(qr);
    state.lastQrDataUrl = dataUrl;

    await setMarketplaceStatus(marketplaceId, {
      whatsappStatus: "qr",
      whatsappLastQrAt: new Date(),
      whatsappLastError: null,
    });
  });

  client.on("ready", async () => {
    await setMarketplaceStatus(marketplaceId, {
      whatsappStatus: "connected",
      whatsappLastOkAt: new Date(),
      whatsappLastError: null,
    });
  });

  client.on("authenticated", async () => {
    await setMarketplaceStatus(marketplaceId, {
      whatsappStatus: "connected",
      whatsappLastOkAt: new Date(),
      whatsappLastError: null,
    });
  });

  client.on("auth_failure", async (msg) => {
    await setMarketplaceStatus(marketplaceId, {
      whatsappStatus: "error",
      whatsappLastError: String(msg || "auth_failure"),
    });
  });

  client.on("disconnected", async (reason) => {
    await setMarketplaceStatus(marketplaceId, {
      whatsappStatus: "disconnected",
      whatsappLastError: String(reason || "disconnected"),
    });
  });

  // incoming messages -> salvează + update lead (reply + stop)
  client.on("message", async (message) => {
    try {
      const from = message.from || "";
      // from arată gen: 407xxxxxxxx@c.us
      const fromPhone = from.split("@")[0] || "";
      const body = message.body || "";

      // save inbound
      const inbound = await prisma.whatsAppInboundMessage.create({
        data: {
          marketplaceId,
          fromPhone,
          body,
        },
      });

      // match lead by phone
      const lead = await prisma.lead.findFirst({
        where: { marketplaceId, phone: fromPhone },
      });

      if (lead) {
        await prisma.whatsAppInboundMessage.update({
          where: { id: inbound.id },
          data: { leadId: lead.id },
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { lastReplyAt: new Date() },
        });

        const low = body.toLowerCase();
        const stopWords = ["stop", "nu mai", "dezabon", "lasă-mă", "nu trimite"];
        if (stopWords.some((w) => low.includes(w))) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { doNotContact: true, inSequence: false },
          });
        }
      }
    } catch (e) {
      // nu aruncăm, ca să nu crape worker-ul
      console.error("WA inbound error:", e);
    }
  });

  await setMarketplaceStatus(marketplaceId, { whatsappStatus: "disconnected" });

  client.initialize();
  return state;
}

async function getQrDataUrl(marketplaceId) {
  const state = await ensureClient(marketplaceId);
  return state.lastQrDataUrl;
}

async function sendWhatsApp(marketplaceId, phoneRaw, text) {
  const state = await ensureClient(marketplaceId);
  const phone = normalizeE164(phoneRaw);
  if (!phone) throw new Error("Phone missing/invalid");

  const chatId = `${phone}@c.us`;
  const res = await state.client.sendMessage(chatId, text);
  return res?.id?.id || null;
}

module.exports = { ensureClient, getQrDataUrl, sendWhatsApp };
