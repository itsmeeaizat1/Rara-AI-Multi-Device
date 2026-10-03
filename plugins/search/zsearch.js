// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zsearch suite — 9 fitur cari zelapi kategori /search (live verified 15 Sep 2026):
//   .zapkmody <app> — cari APK mod
//   .zcookpad <masakan> — cari resep
//   .zdetik <berita> — cari berita detik
//   .zdeviant <art> — cari art deviantart
//   .zdns <domain> — DNS lookup
//   .zgroupwa <topik> — cari grup WA
//   .ztwixtor <anime> — twixtor clips
//   .zjadwaltv <channel> — jadwal TV
//   .zacode <plugin> — plugin editor Acode
// ═════════════════════════════════════════════

import {
  zsApkmody, zsCookpad, zsDetik, zsDeviantart, zsDns, zsGroupwa, zsTwixtor, zsJadwalTv, zsAcode,
  ZS_DNS_TYPES, _setZelSearchHttpForTest, _setZelSearchKeyForTest,
} from "../../src/scraper/zelsearch.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zsearch",
  alias: ["zapkmody", "zapkmod", "zcookpad", "zresep", "zdetik", "zberita", "zdeviant", "zdeviantart", "zdns", "zgroupwa", "zcariwa", "ztwixtor", "zjadwaltv", "zjadwaltv2", "zacode"],
  category: "search",
  description: "Search suite zelapi — apk mod, resep, berita, art, dns, grup wa, twixtor, jadwal tv, acode",
  usage: ".zsearch — daftar | .zapkmody whatsapp | .zcookpad rendang | .zdetik covid | .zdns google.com | .zgroupwa anime | .zjadwaltv gtv",
  example: ".zcookpad rendang",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 1, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const short = (s, n = 90) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

function usageCard() {
  return raraWrap("zsearch", [
    "🔍 SEARCH SUITE:",
    "",
    "▸ .zapkmody <app> — cari APK mod",
    "▸ .zcookpad <masakan> — cari resep",
    "▸ .zdetik <topik> — berita detik",
    "▸ .zdeviant <art> — art deviantart",
    "▸ .zdns <domain> — DNS lookup",
    "▸ .zgroupwa <topik> — cari grup WA",
    "▸ .ztwixtor <anime> — twixtor clips",
    "▸ .zjadwaltv <channel> — jadwal TV",
    "▸ .zacode <plugin> — plugin Acode",
  ].join("\n"));
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    const text = (m.text || args.join(" ") || "").trim();

    if (command === "zsearch") return m.reply(usageCard());
    if (!text) {
      await m.react("❌");
      const u = { zapkmody: "nama APK — contoh: .zapkmody whatsapp", zapkmod: "nama APK", zcookpad: "nama masakan — contoh: .zcookpad rendang", zresep: "nama masakan", zdetik: "topik berita", zberita: "topik berita", zdeviant: "kata kunci art", zdeviantart: "kata kunci art", zdns: "domain — contoh: .zdns google.com", zgroupwa: "topik grup", zcariwa: "topik grup", ztwixtor: "nama anime", zjadwaltv: "channel — rcti/gtv/mnctv/sctv/indosiar/trans7/transtv", zjadwaltv2: "channel", zacode: "nama plugin Acode" };
      return m.reply(raraWrap("zsearch", `Query kosong — kirim ${u[command] || "query-nya"}`));
    }

    await m.react("🧠");

    if (command === "zapkmody" || command === "zapkmod") {
      const r = await zsApkmody(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Apkmody bermasalah: ${r.error}`)); }
      const lines = [`✅ APK MOD — ${r.total} ketemu`, ""];
      r.list.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. 📦 ${a.name}${v(a.version) ? " v" + a.version : ""}`);
        if (v(a.feature)) lines.push(`   ${a.feature}`);
        if (v(a.url)) lines.push(`   ${a.url}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zcookpad" || command === "zresep") {
      const r = await zsCookpad(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Cookpad bermasalah: ${r.error}`)); }
      const lines = ["✅ RESEP COOKPAD", ""];
      r.list.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. 🍳 ${a.title}`);
        const meta = [];
        if (v(a.prepTime)) meta.push(`⏱️ ${a.prepTime}`);
        if (v(a.servings)) meta.push(`🍽️ ${a.servings}`);
        if (meta.length) lines.push(`   ${meta.join(" · ")}`);
        if (v(a.url)) lines.push(`   ${a.url}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zdetik" || command === "zberita") {
      const r = await zsDetik(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Detik bermasalah: ${r.error}`)); }
      const lines = [`✅ BERITA DETIK — ${r.total} hasil`, ""];
      r.list.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. 📰 ${short(a.title, 110)}`);
        if (v(a.channel)) lines.push(`   📡 ${a.channel}`);
        if (v(a.url)) lines.push(`   ${a.url}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zdeviant" || command === "zdeviantart") {
      const r = await zsDeviantart(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Deviantart bermasalah: ${r.error}`)); }
      const lines = [`✅ DEVIANTART — ${r.total} art`, ""];
      r.list.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. 🎨 ${short(a.cleanTitle, 90)}`);
        if (v(a.artist)) lines.push(`   👤 ${a.artist}`);
        if (v(a.url)) lines.push(`   ${a.url}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zdns") {
      const r = await zsDns(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `DNS bermasalah: ${r.error}`)); }
      const lines = [`✅ DNS LOOKUP — ${r.domain}`, ""];
      ZS_DNS_TYPES.forEach((t) => {
        const recs = (r.records[t] || []).slice(0, 3);
        recs.forEach((rec) => lines.push(`🏷️ ${t}  ${v(rec.data) ? rec.data : ""}${v(rec.priority) ? "  (prio " + rec.priority + ")" : ""}${v(rec.ttl) ? "  ttl " + rec.ttl : ""}`));
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zgroupwa" || command === "zcariwa") {
      const r = await zsGroupwa(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Groupwa bermasalah: ${r.error}`)); }
      const lines = [`✅ GRUP WA "${text}" — ${r.total} ketemu`, ""];
      r.list.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. 👥 ${short(a.name, 90)}`);
        if (v(a.link)) lines.push(`   ${a.link}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "ztwixtor") {
      const r = await zsTwixtor(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Twixtor bermasalah: ${r.error}`)); }
      const lines = ["✅ TWIXTOR CLIPS", ""];
      r.list.slice(0, 6).forEach((a, i) => {
        lines.push(`${i + 1}. 🎬 ${short(a.title, 90)}`);
        const meta = [];
        if (v(a.views)) meta.push(`👁️ ${a.views}`);
        if (v(a.comments)) meta.push(`💬 ${a.comments}`);
        if (meta.length) lines.push(`   ${meta.join(" · ")}`);
        if (v(a.link)) lines.push(`   ${a.link}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zjadwaltv" || command === "zjadwaltv2") {
      const r = await zsJadwalTv(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Jadwal TV bermasalah: ${r.error}`)); }
      const lines = [`✅ JADWAL TV — ${r.channel}`, ""];
      r.jadwal.slice(0, 20).forEach((j) => lines.push(`🕒 ${v(j.time) ? j.time.replace("WIB", " WIB") : "??"} · ${short(j.title, 70)}`));
      await m.reply(raraWrap("zsearch", lines.join("\n")));

    } else if (command === "zacode") {
      const r = await zsAcode(text);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zsearch", `Acode bermasalah: ${r.error}`)); }
      const lines = ["✅ PLUGIN ACODE", ""];
      r.list.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. 🧩 ${a.name}${v(a.version) ? " v" + a.version : ""}`);
        const meta = [];
        if (v(a.downloads)) meta.push(`⬇️ ${a.downloads}`);
        if (v(a.rating)) meta.push(`⭐ ${a.rating}`);
        if (v(a.author)) meta.push(`👤 ${a.author}`);
        if (meta.length) lines.push(`   ${meta.join(" · ")}`);
        if (v(a.link)) lines.push(`   ${a.link}`);
      });
      await m.reply(raraWrap("zsearch", lines.join("\n")));
    } else {
      return m.reply(usageCard());
    }
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zsearch", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
