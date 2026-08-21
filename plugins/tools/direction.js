// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "direction", alias: ["rute", "arah", "navigate"], category: "tools",
  description: "Rute & arah GPS", usage: ".direction <dari> -> <ke>",
  example: ".direction Jakarta -> Bandung", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 10, energi: 0, isEnabled: true,
};

async function geocode(q) {
  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q, format: "json", limit: 1 }, timeout: 10000,
    headers: { "User-Agent": "NovaBot/1.0" },
  });
  if (!data?.length) throw new Error(`Lokasi "${q}" tidak ditemukan`);
  return { lat: data[0].lat, lon: data[0].lon, name: data[0].display_name };
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input || !input.includes("->")) {
      await sendReplyWithNav(sock, m, claraWrap("Rute & Arah", [`╎❏ Penggunaan: *${prefix}direction <dari> -> <ke>*`,
        `╎❏ Contoh: *${prefix}direction Jakarta -> Bandung*`].join("\n")), "direction");
      return { handled: true };
    }
    const [from, to] = input.split("->").map(s => s.trim());
    const a = await geocode(from);
    const b = await geocode(to);
    const url = `https://www.openstreetmap.org/directions?from=${a.lat},${a.lon}&to=${b.lat},${b.lon}`;
    const distKm = (Math.acos(Math.sin(a.lat*Math.PI/180)*Math.sin(b.lat*Math.PI/180) +
      Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.cos(b.lon*Math.PI/180-a.lon*Math.PI/180))*6371).toFixed(0);
    await m.reply(claraWrap("Rute & Arah", [`╎❏ Dari: *${a.name.substring(0,50)}*`,
      `╎❏ Ke: *${b.name.substring(0,50)}*`,
      `╎❏ Jarak: *${distKm} km* (garis lurus)`,
      `╎❏ Peta: ${url}`].join("\n")) + "\n" + tipText("Klik link peta untuk navigasi"));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`╎❏ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };