const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { sendWhatsApp } = require("../services/whatsapp.manager");
const { pushbulletSendNote } = require("../services/pushbullet.service");
const { updateLeadMetaInWp } = require("../services/wordpress.service"); // îl adăugăm mai jos

function inSendWindow(now, startHour, endHour) {
  const h = now.getHours();
  return h >= startHour && h < endHour;
}

async function runOnce() {
  const now = new Date();

  // ia următoarele joburi care sunt due
  const jobs = await prisma.messageQueue.findMany({
    where: {
      status: "queued",
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
    include: {
      lead: true,
      marketplace: true,
    },
  });

  for (const job of jobs) {
    const mp = job.marketplace;
    const lead = job.lead;

    // safety checks
    if (lead.doNotContact || lead.isClient) {
      await prisma.messageQueue.update({
        where: { id: job.id },
        data: { status: "skipped", errorMessage: "lead blocked (DNC or client)" },
      });
      continue;
    }

    if (!inSendWindow(now, mp.sendWindowStartHour, mp.sendWindowEndHour)) {
      // reprogramăm la începutul ferestrei de mâine (simplu)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(mp.sendWindowStartHour, 0, 0, 0);

      await prisma.messageQueue.update({
        where: { id: job.id },
        data: { scheduledAt: tomorrow },
      });
      continue;
    }

    // trimite
    await prisma.messageQueue.update({
      where: { id: job.id },
      data: { status: "sending", attemptCount: { increment: 1 } },
    });

    try {
      let providerId = null;

      if (job.channel === "whatsapp") {
        providerId = await sendWhatsApp(mp.id, lead.phone, job.content);
      } else if (job.channel === "pushbullet") {
        await pushbulletSendNote({
          tokenEnc: mp.pushbulletTokenEnc,
          deviceIden: mp.pushbulletDeviceId || null,
          title: `Lead ${lead.phone}`,
          body: job.content,
        });
      } else {
        throw new Error("Unknown channel: " + job.channel);
      }

      // update job + lead
      await prisma.messageQueue.update({
        where: { id: job.id },
        data: { status: "sent", sentAt: new Date(), providerMsgId: providerId },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          inSequence: true,
          lastSentAt: new Date(),
          currentStep: lead.currentStep + 1,
          hideFromListing: true,
        },
      });

      // ✅ sync meta în WP (ascunde + status)
      await updateLeadMetaInWp(mp, lead.wpPostId, {
        crm_current_step: String(lead.currentStep + 1),
        crm_last_sent_at: new Date().toISOString(),
        crm_hide_from_listing: "1",
      });

      // ✅ auto-schedule next step dacă template-ul are followUpAfterMinutes
      if (job.templateId) {
        const tpl = await prisma.messageTemplate.findUnique({ where: { id: job.templateId } });
        if (tpl && tpl.followUpAfterMinutes > 0) {
          const nextTpl = await prisma.messageTemplate.findFirst({
            where: {
              marketplaceId: mp.id,
              isActive: true,
              channel: tpl.channel,
              stepNumber: tpl.stepNumber + 1,
            },
          });

          if (nextTpl) {
            const nextAt = new Date(Date.now() + tpl.followUpAfterMinutes * 60 * 1000);
            await prisma.messageQueue.create({
              data: {
                marketplaceId: mp.id,
                leadId: lead.id,
                templateId: nextTpl.id,
                channel: nextTpl.channel,
                content: nextTpl.content,
                status: "queued",
                scheduledAt: nextAt,
              },
            });
          }
        }
      }

      // delay minim între mesaje (anti-spam)
      if (mp.minDelaySeconds > 0) {
        await new Promise((r) => setTimeout(r, mp.minDelaySeconds * 1000));
      }
    } catch (err) {
      await prisma.messageQueue.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: String(err?.message || err) },
      });

      // fallback: pushbullet alert către tine când WhatsApp cade
      try {
        if (mp.pushbulletTokenEnc) {
          await pushbulletSendNote({
            tokenEnc: mp.pushbulletTokenEnc,
            deviceIden: mp.pushbulletDeviceId || null,
            title: "WhatsApp send FAILED",
            body: `Marketplace: ${mp.name}\nLead: ${lead.phone}\nError: ${String(err?.message || err)}`,
          });
        }
      } catch (_) {}
    }
  }
}

function startQueueRunner() {
  // rulează la fiecare 10 secunde
  setInterval(() => {
    runOnce().catch((e) => console.error("queueRunner error:", e));
  }, 10000);

  console.log("✅ Queue runner started");
}

module.exports = { startQueueRunner };
