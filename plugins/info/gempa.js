import axios from "axios";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gempa",
  alias: ["bmkg", "infogempa", "earthquake", "gempaterkini", "gempadirasakan"],
  category: "info",
  description: "Info gempa terkini dari BMKG (gempa terbaru, dirasakan, list)",
  usage: ".gempa [terkini/dirasakan/list]",
  example: ".gempa",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const API_BASE = "https://data.bmkg.go.id/DataMKG/TEWS";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("BMKG API error: " + res.status);
  return res.json();
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const subCmd = args[0] || "";

    // GEMPA TERKINI (1 gempa terbaru + shakemap)
    if (!subCmd || subCmd === "terkini" || subCmd === "latest") {
      const data = await fetchJson(API_BASE + "/autogempa.json");
      const g = data.Infogempa.gempa;
      const shakemapUrl = g.Shakemap
        ? API_BASE + "/" + g.Shakemap
        : null;

      let txt = "╔┈┈「 GEMPA TERKINI — BMKG 」╎❏\n";
      txt += "╚┈┈❖\n\n";
      txt += "Tanggal: *" + g.Tanggal + "*\n";
      txt += "Jam: *" + g.Jam + "*\n";
      txt += "Magnitude: *" + g.Magnitude + "*\n";
      txt += "Kedalaman: *" + g.Kedalaman + "*\n";
      txt += "Koordinat: " + g.Coordinates + "\n";
      txt += "Lintang: " + g.Lintang + "\n";
      txt += "Bujur: " + g.Bujur + "\n";
      txt += "Wilayah: *" + g.Wilayah + "*\n";
      txt += "Potensi: *" + g.Potensi + "*\n";
      if (g.Dirasakan) {
        txt += "Dirasakan: " + g.Dirasakan + "\n";
      }
      txt += "\nSumber: BMKG (data.bmkg.go.id)";

      if (shakemapUrl) {
        try {
          const imgRes = await fetch(shakemapUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            await sock.sendMessage(
              m.key.remoteJid,
              { image: buffer, caption: txt },
              { quoted: m }
            );
            return;
          }
        } catch (e) { /* fallback to text */ }
      }
      return await sendReplyWithNav(sock, m, txt, "gempa");
    }

    // GEMPA DIRASAKAN (15 terbaru)
    if (subCmd === "dirasakan" || subCmd === "felt") {
      const data = await fetchJson(API_BASE + "/gempadirasakan.json");
      const gempaList = data.Infogempa.gempa;
      const limit = Math.min(10, gempaList.length);

      let txt = "╔┈┈「 GEMPA DIRASAKAN — BMKG 」╎❏\n";
      txt += "╚┈┈❖\n";
      txt += "10 gempa dirasakan terbaru\n\n";

      for (let i = 0; i < limit; i++) {
        const g = gempaList[i];
        txt += (i + 1) + ". M" + g.Magnitude + " — " + g.Wilayah + "\n";
        txt += "   " + g.Tanggal + " " + g.Jam + "\n";
        txt += "   Kedalaman: " + g.Kedalaman + " | Dirasakan: " + g.Dirasakan + "\n\n";
      }

      txt += "Sumber: BMKG (data.bmkg.go.id)";
      return await m.reply(claraWrap("gempa", txt));
    }

    // GEMPA LIST (M 5.0+ terbaru)
    if (subCmd === "list" || subCmd === "terbaru" || subCmd === "terkini") {
      const data = await fetchJson(API_BASE + "/gempaterkini.json");
      const gempaList = data.Infogempa.gempa;
      const limit = Math.min(15, gempaList.length);

      let txt = "╔┈┈「 GEMA TERKINI M5.0+ — BMKG 」╎❏\n";
      txt += "╚┈┈❖\n";
      txt += "15 gempa M 5.0+ terbaru\n\n";

      for (let i = 0; i < limit; i++) {
        const g = gempaList[i];
        txt += (i + 1) + ". M" + g.Magnitude + " — " + g.Wilayah + "\n";
        txt += "   " + g.Tanggal + " " + g.Jam + "\n";
        txt += "   Kedalaman: " + g.Kedalaman + "\n";
        txt += "   Potensi: " + g.Potensi + "\n\n";
      }

      txt += "Sumber: BMKG (data.bmkg.go.id)";
      return await m.reply(claraWrap("gempa", txt));
    }

    // HELP
    let txt = "╔┈┈「 INFO GEMPA — BMKG 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Data gempa langsung dari BMKG Indonesia.\n\n";
    txt += "*Perintah:*\n";
    txt += "1. .gempa — Gempa terkini (1 terbaru + shakemap)\n";
    txt += "2. .gempa dirasakan — 10 gempa dirasakan terbaru\n";
    txt += "3. .gempa list — 15 gempa M 5.0+ terbaru\n\n";
    txt += "Sumber: data.bmkg.go.id (API resmi BMKG)";
    return m.reply(claraWrap("gempa", txt));
  } catch (error) {
    return m.reply("Error: " + error.message + "\n\nCoba lagi nanti.");
  }
}

export { pluginConfig as config, handler };
