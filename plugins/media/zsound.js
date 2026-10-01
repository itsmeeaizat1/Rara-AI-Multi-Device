// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zsound <query> — search sound effect dari MyInstants (ribuan sound,
//   live search) → kirim VN — versi atas .sfx yang cuma 30 sound hardcode.
// 🔹 API: myinstants-api.vercel.app/search?q= (abdipr) — live verified.
// ═════════════════════════════════════════════

import { lokMyinstants, _setLokalHttpForTest } from "../../src/scraper/lokalapi.js";
import { toVoiceNote } from "../../src/lib/rara-ffmpeg.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";

const pluginConfig = {
  name: "zsound",
  alias: ["myinstants", "carisound", "soundsfx"],
  category: "media",
  description: "Search sound effect MyInstants (ribuan sound live) — kirim VN",
  usage: ".zsound <query> — contoh: .zsound bruh | .zsound naruto run | .zsound nana kung",
  example: ".zsound bruh",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = (m.text || (m.args || []).join(" ") || "").trim();
    if (!text) {
      await m.react("❌");
      return m.reply(raraWrap("zsound", "Query kosong — kirim nama sound.\nContoh: .zsound bruh\n.zsound naruto run\n\nSumber: MyInstants (ribuan sound) — hasil #1 dikirim jadi VN, 4 berikutnya dilist."));
    }
    await m.react("🧠");

    const r = await lokMyinstants(text);
    if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsound", `Sound bermasalah: ${r.error}`)); }

    const first = r.list[0];
    const others = r.list.slice(1, 5);
    const listCard = raraWrap("zsound", [
      `✅ MYINSTANTS "${text}" — ${r.list.length} sound`,
      "",
      `🎵 Dikirim (VN): ${first.title}`,
      ...(others.length ? ["", "Lainnya:"] : [],
        others.map((o, i) => `${i + 2}. ${o.title}`)),
      ...(others.length ? ["", `Ambil lain: balas nomor pakai .zsound — atau buka: ${others[0].url}`] : []),
    ].join("\n"));

    // download VN pertama
    let audioBuf = null;
    try {
      const res = await axios.get(first.mp3, { timeout: 20000, responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.data && res.data.length > 100) audioBuf = Buffer.from(res.data);
    } catch { /* download gagal → cukup list */ }

    if (audioBuf) {
      const tmpDir = path.join(os.tmpdir(), "rara-zsound");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const outPath = path.join(tmpDir, "snd_" + Date.now() + ".mp3");
      fs.writeFileSync(outPath, audioBuf);
      try {
        await sock.sendMessage(m.chat || m.key?.remoteJid, {
          audio: await toVoiceNote(audioBuf),
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        });
      } finally {
        try { fs.unlinkSync(outPath); } catch {}
      }
    }
    await m.reply(listCard + (audioBuf ? "" : "\n\n⚠️ VN gagal didownload — buka link: " + first.url));
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zsound", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
