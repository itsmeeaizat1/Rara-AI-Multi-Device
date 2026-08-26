// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { notifySewaRejected } from "../../src/lib/nova-saluran-broadcast.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rejectsewa",
  alias: ["rejectsewa", "sewareject", "tolaksewa"],
  category: "owner",
  description: "Tolak pendaftaran sewa dari user",
  usage: ".rejectsewa <nomor> <alasan>",
  example: ".rejectsewa 628xxx grup penuh",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  if (!db.db.data.sewa) {
    db.db.data.sewa = { enabled: false, groups: {}, registrations: {} };
    db.db.write();
  }
  if (!db.db.data.sewa.registrations) {
    db.db.data.sewa.registrations = {};
    db.db.write();
  }

  const input = m.text?.trim();
  if (!input) {
    return m.reply( claraWrap("Rejectsewa", "Format: *.rejectsewa <nomor> <alasan>*\n\nContoh: .rejectsewa 628xxx grup penuh"), { commandName: "rejectsewa" });
  }

  const parts = input.split(/\s+/);
  const phoneNum = parts[0]?.replace(/\D/g, "");
  const reason = parts.slice(1).join(" ") || "Ditolak oleh owner";

  if (!phoneNum) {
    return m.reply(claraWrap("Rejectsewa", "Nomor tidak valid. Format: .rejectsewa <nomor> <alasan>"));
  }

  // Find registration
  let regKey = null;
  let regData = null;
  for (const [key, val] of Object.entries(db.db.data.sewa.registrations)) {
    if (val.phoneNumber === phoneNum && val.status === "pending") {
      regKey = key;
      regData = val;
      break;
    }
  }

  if (!regData) {
    return m.reply("Tidak ada pendaftaran pending dari nomor " + phoneNum);
  }

  // Update registration status
  db.db.data.sewa.registrations[regKey].status = "rejected";
  db.db.data.sewa.registrations[regKey].rejectedAt = Date.now();
  db.db.data.sewa.registrations[regKey].rejectedBy = m.sender;
  db.db.data.sewa.registrations[regKey].rejectReason = reason;
  db.db.write();

  // Notify registrant
  try {
    await sock.sendMessage(regData.sender, {
      text:
        "Pendaftaran Sewa Ditolak\n\n" +
        "Grup: *" + regData.groupName + "*\n" +
        "Alasan: " + reason + "\n\n" +
        "Hubungi owner untuk info lebih lanjut.",
    });
  } catch (e) { console.error('[rejectsewa.js]:', e.message); }

  // Broadcast ke saluran
  await notifySewaRejected(sock, {
    name: regData.name,
    groupName: regData.groupName,
    phoneNumber: phoneNum,
    reason,
  }).catch((e) => { console.error('[rejectsewa.js]:', e.message); });

  return m.reply(
    "Sewa Ditolak\n\n" +
    "Nomor: " + phoneNum + "\n" +
    "Grup: *" + regData.groupName + "*\n" +
    "Alasan: " + reason + "\n\n" +
    "User sudah diberi tahu."
  );
}

export { pluginConfig as config, handler };
