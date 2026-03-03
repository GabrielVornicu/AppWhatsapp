const axios = require("axios");
const { decrypt } = require("../config/crypto");

async function pushbulletSendNote({ tokenEnc, title, body, deviceIden = null }) {
  if (!tokenEnc) throw new Error("Pushbullet token missing");

  const token = decrypt(tokenEnc);

  const payload = { type: "note", title, body };
  if (deviceIden) payload.device_iden = deviceIden;

  const res = await axios.post("https://api.pushbullet.com/v2/pushes", payload, {
    headers: { "Access-Token": token, "Content-Type": "application/json" },
    timeout: 15000,
  });

  return res.data;
}

module.exports = { pushbulletSendNote };
