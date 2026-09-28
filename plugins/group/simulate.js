// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .simulate — simulasi event grup (port HIROBOT simulate.js, adaptasi via ev.emit)
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "simulate",
  alias: ["simgroup"],
  category: "owner",
  description: "Simulasi event grup (welcome/bye/promote/demote) buat tes respons bot",
  usage: ".simulate <event> @user",
  example: ".simulate welcome @user",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").replace(new RegExp("^" + prefix + "simulate\\s*", "i"), "").trim();
    const parts = raw.split(/\s+/);
    const event = (parts[0] || "").toLowerCase();
    if (!event) {
      await m.react("🐣");
      await m.reply(novaGuide(
        "simulate",
        "Simulasi event grup buat ngetes respons bot (welcome/bye/promote/demote) tanpa ada orang beneran keluar/masuk.",
        prefix + "simulate welcome @user",
        "Event: add/welcome · bye/kick/leave · promote · demote. Tanpa mention = kamu sendiri. Owner-only."
      ));
      return { handled: true };
    }
    const map = { add: "add", invite: "add", welcome: "add", bye: "remove", kick: "remove", leave: "remove", remove: "remove", promote: "promote", demote: "demote" };
    const action = map[event];
    if (!action) {
      await m.react("❌");
      await m.reply(novaError("Simulate", 'Event "' + event + '" gak dikenal — pilih add/bye/promote/demote'));
      return { handled: true };
    }
    const mentioned = (raw.match(/@\d+/g) || []).map((x) => x.slice(1) + "@s.whatsapp.net");
    const participants = mentioned.length ? mentioned : [m.sender];
    await m.reply(claraWrap("Simulate", "Simulasi *" + action + "* berjalan..."));
    sock.ev?.emit("group-participants.update", {
      id: m.chat,
      participants,
      action,
      actor: m.sender,
    });
    await m.react("⚡");
  } catch (error) {
    console.error("[simulate]:", error.message);
    await m.react("❌");
    await m.reply(novaError("Simulate", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
