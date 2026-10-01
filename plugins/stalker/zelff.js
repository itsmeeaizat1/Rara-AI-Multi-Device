// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zff — backup Free Fire suite dari zelapi (4 endpoint live):
//   .zff search <nickname>  — cari pemain → uid/region/level/like
//   .zff profile <uid>      — profil lengkap pemain
//   .zff stats <uid> [br|cs] — statistik solo/duo/squad atau clash squad
//   .zff like <uid> [region] — kirim like (region default SG — satu-satunya
//                             region berkredensial di zelapi per live test 15 Sep)
// 🔹 Bot udah punya .ffstalk (nexray) — ini versi backup z-variant zelapi.
// 🔹 STRICT: upstream zelapi flaky → error asli, no fallback.
// ═════════════════════════════════════════════

import {
  ffSearch, ffProfile, ffStats, ffLike,
  ZEL_FF_MODES, _setZelffHttpForTest, _setZelffKeyForTest,
} from "../../src/scraper/zelff.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zff",
  alias: ["zfreefire", "zffsearch", "zffprofile", "zffstats", "zfflike"],
  category: "stalker",
  description: "Free Fire zelapi (backup) — search/profile/stats/like pemain",
  usage: ".zff search <nick> | .zff profile <uid> | .zff stats <uid> [br|cs] | .zff like <uid> [region]",
  example: ".zff search panda",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 1, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const ts = (s) => {
  const n = Number(s);
  if (!n || isNaN(n)) return null;
  const d = new Date(n * 1000);
  if (isNaN(d.getTime()) || d.getFullYear() < 2019) return null;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

function usageCard() {
  return raraWrap("zff", [
    "🎮 FREE FIRE (zelapi — backup):",
    "",
    "▸ .zff search <nickname> — cari pemain",
    "▸ .zff profile <uid> — profil lengkap",
    "▸ .zff stats <uid> [br|cs] — statistik (br = solo/duo/squad, cs = clash squad)",
    "▸ .zff like <uid> [region] — kirim like (default SG — region lain belum berkredensial di zelapi)",
  ].join("\n"));
}

function fmtNum(n) {
  const x = Number(n);
  return (x === null || x === undefined || isNaN(x)) ? null : x.toLocaleString("id-ID");
}

function cardSearch(results) {
  const lines = [];
  results.slice(0, 8).forEach((r0, i) => {
    const nick = v(r0.nickname)?.replace(/[\t\n\r ]+/g, " ").trim() || "(?)";
    const row = [`${i + 1}. ${nick}`];
    if (r0.region) row.push(String(r0.region));
    if (v(r0.level)) row.push(`lv ${r0.level}`);
    if (v(r0.liked) !== null) row.push(`❤️ ${fmtNum(r0.liked)}`);
    lines.push(row.join(" · ") + `\n   🆔 ${r0.accountid}`);
  });
  if (results.length > 8) lines.push("", `…+${results.length - 8} lagi — spesifikan nickname-nya`);
  return lines.join("\n");
}

function cardProfile(d) {
  const b = d?.basicinfo || {};
  const clan = d?.clanbasicinfo || {};
  const lines = [];
  const nick = v(b.nickname)?.replace(/[\t\n\r ]+/g, " ").trim();
  lines.push(`👤 ${nick || "(?)"}`, `🆔 ${b.accountid}`);
  if (b.region) lines.push(`🌍 ${b.region}`);
  if (v(b.level)) lines.push(`⭐ Level ${b.level}`);
  if (v(b.liked) !== null) lines.push(`❤️ ${fmtNum(b.liked)} like`);
  const last = ts(b.lastloginat);
  if (last) lines.push(`🕒 terakhir main: ${last}`);
  if (v(clan.clanname) && clan.clanname !== "") {
    const cInfo = [`🏰 ${clan.clanname}`];
    if (v(clan.clanlevel)) cInfo.push(`lv ${clan.clanlevel}`);
    if (v(clan.membernum)) cInfo.push(`${clan.membernum} anggota`);
    lines.push(cInfo.join(" · "));
  }
  const marked = d?.profileinfo?.ismarkedstar;
  if (marked === true) lines.push("✨ Marked Star");
  return lines.join("\n");
}

function cardStats(mode, d) {
  const lines = [];
  const blocks = mode === "cs" ? [["csstats", "⚔️ CLASH SQUAD"]] : [["solostats", "🚀 SOLO"], ["duostats", "👥 DUO"], ["quadstats", "🛡️ SQUAD"]];
  for (const [key, label] of blocks) {
    const s = d?.[key];
    if (!s || String(s.accountid) === "0") continue;
    lines.push(label);
    const row = [`  🎮 ${fmtNum(s.gamesplayed) || 0} main`];
    if (v(s.wins) !== null) row.push(`🏆 ${fmtNum(s.wins)}`);
    if (v(s.kills) !== null) row.push(`💀 ${fmtNum(s.kills)}`);
    lines.push(row.join(" · "));
    const det = s.detailedstats || {};
    const detRow = [];
    if (v(det.damage)) detRow.push(`⚔️ dmg ${fmtNum(det.damage)}`);
    if (v(det.headshotkills)) detRow.push(`🎯 HS ${fmtNum(det.headshotkills)}`);
    if (v(det.knockdown) || v(det.knockdowns)) detRow.push(`🔨 KD ${fmtNum(det.knockdown || det.knockdowns)}`);
    if (v(det.mvpcount)) detRow.push(`⭐ MVP ${fmtNum(det.mvpcount)}`);
    if (v(det.highestkills)) detRow.push(`🔥 max ${fmtNum(det.highestkills)}`);
    if (detRow.length) lines.push("  " + detRow.join(" · "));
    lines.push("");
  }
  return lines.length ? lines.join("\n") : null;
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    if (command === "zff") return m.reply(usageCard());

    let action = null;
    if (command === "zffsearch") action = "search";
    else if (command === "zffprofile") action = "profile";
    else if (command === "zffstats") action = "stats";
    else if (command === "zfflike") action = "like";
    else if (command === "zfreefire") action = (args[0] || "").toLowerCase() || null;
    if (!action) return m.reply(usageCard());

    if (action === "search") {
      const q = args.join(" ").trim();
      if (!q) { await m.react("❌"); return m.reply(raraWrap("zff", "Kirim nickname-nya — .zff search <nickname>")); }
      await m.react("🧠");
      const r = await ffSearch(q);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zff", `FF search bermasalah: ${r.error}`)); }
      await m.reply(raraWrap("zff", `✅ FF SEARCH (zelapi)\n\n${cardSearch(r.results)}`));
    } else if (action === "profile") {
      await m.react("🧠");
      const r = await ffProfile(args[0]);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zff", `FF profile bermasalah: ${r.error}`)); }
      await m.reply(raraWrap("zff", "✅ FF PROFILE (zelapi)\n\n" + cardProfile(r.profile)));
    } else if (action === "stats") {
      const uid = args[0];
      const mode = (args[1] || "br").toLowerCase();
      if (!ZEL_FF_MODES.includes(mode)) { await m.react("❌"); return m.reply(raraWrap("zff", "Mode gak valid — pilihan: br / cs")); }
      await m.react("🧠");
      const r = await ffStats(uid, mode);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zff", `FF stats bermasalah: ${r.error}`)); }
      const card = cardStats(mode, r.stats);
      if (!card) { await m.react("❌"); return m.reply(raraWrap("zff", "Stats-nya kosong buat mode ini — coba mode lain (br/cs)")); }
      await m.reply(raraWrap("zff", `✅ FF STATS ${mode.toUpperCase()} (zelapi)\n\n${card}`));
    } else if (action === "like") {
      const uid = args[0];
      const region = (args[1] || "SG").toUpperCase();
      await m.react("🧠");
      const r = await ffLike(uid, region);
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zff", `FF like bermasalah: ${r.error}`)); }
      await m.reply(raraWrap("zff", `✅ LIKE TERKIRIM (zelapi)\n\n❤️ like dikirim ke uid ${r.uid} (region ${r.region})`));
    }
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zff", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
