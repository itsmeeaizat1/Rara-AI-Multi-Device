// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// cpanelprotect.js — Proteksi cpanel (owner 7 Okt 2026):
// ".cpanelprotect on aktif, .cpanelprotect settings buat cek mau apa aja
// fitur protect yg diaktifin" — owner only, master + toggle per aksi.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  setGuardField,
  getGuardStatus,
  setGuardSock,
  syncGuardMonitor,
  runGuardCheck,
} from "../../src/lib/rara-cpanel-guard.js";
import {
  PROTECT_FEATURES,
  FEATURE_LABEL,
  isFeatureName,
  setMaster,
  setFeature,
  setAllFeatures,
  protectStatus,
} from "../../src/lib/rara-cpanel-protect.js";

const pluginConfig = {
  name: "cpanelprotect",
  alias: ["panelprotect", "protectcpanel"],
  category: "panel",
  description: "Proteksi cpanel: blokir aksi + guard limit cpu/ram/disk auto-matikan (owner only)",
  usage: ".cpanelprotect on/off | settings | <fitur> on/off | guard | cpu/ram/disk <batas>",
  example: ".cpanelprotect on | .cpanelprotect settings | .cpanelprotect cpu 300 | .cpanelprotect guard on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function buildSettings(m) {
  const st = protectStatus();
  const p = m.prefix || ".";
  let txt = `🛡️ CPANEL PROTECT\n\n`;
  txt += `Status: ${st.master ? "🟢 AKTIF" : "🔴 MATI"} (master)\n\n`;
  txt += `Fitur protect:\n`;
  for (const f of PROTECT_FEATURES) {
    const nyala = st.master && st.features[f];
    txt += `${nyala ? "✅" : "⛔"} ${FEATURE_LABEL[f]}\n`;
  }
  txt += `\nTotal aktif: ${st.activeFeatures.length}/${PROTECT_FEATURES.length}\n\n`;
  const g = getGuardStatus();
  txt += `⚙️ GUARD LIMIT RESOURCE\n`;
  txt += `Monitor: ${g.enabled ? (g.running ? "🟢 JALAN" : "🟡 aktif, belum ada limit diset") : "🔴 MATI"}\n`;
  txt += `${g.cpuMax > 0 ? "✅" : "⛔"} CPU — matikan server kalau lewat ${g.cpuMax > 0 ? g.cpuMax + "%" : "(belum diset)"}\n`;
  txt += `${g.ramMax > 0 ? "✅" : "⛔"} RAM — matikan kalau lewat ${g.ramMax > 0 ? g.ramMax + "% dari limit" : "(belum diset)"}\n`;
  txt += `${g.diskMax > 0 ? "✅" : "⛔"} Disk — matikan kalau lewat ${g.diskMax > 0 ? g.diskMax + "% dari limit" : "(belum diset)"}\n`;
  txt += `Cek tiap ${g.intervalMenit} mnt • Aksi: ${g.action === "stop" ? "stop (halus)" : "kill (paksa)"}\n\n`;
  txt += `Cara pakai:\n`;
  txt += `${p}cpanelprotect on/off — nyalakan/matikan semua proteksi\n`;
  txt += `${p}cpanelprotect <fitur> on/off — toggle per aksi\n`;
  txt += `  (fitur: ${PROTECT_FEATURES.join(", ")})\n`;
  txt += `${p}cpanelprotect all on/off — set semua fitur sekaligus\n`;
  txt += `${p}cpanelprotect guard on/off — nyalakan/matikan guard resource\n`;
  txt += `${p}cpanelprotect cpu/ram/disk <batas> — set limit (0 = mati)\n`;
  txt += `  cpu: % pemakaian (mis. 300), ram/disk: % dari limit (mis. 90)\n`;
  txt += `${p}cpanelprotect interval <menit> — jeda cek guard\n`;
  txt += `${p}cpanelprotect action stop/kill — aksi pas nekat batas\n`;
  txt += `${p}cpanelprotect cek — jalankan pengecekan sekarang\n`;
  txt += `${p}cpanelprotect settings — lihat status (command ini)\n\n`;
  txt += `Owner bot selalu bypass proteksi aksi.\n`;
  txt += `Notif saluran: ${p}autobroadcastchannel serverGuardOff on`;
  return raraWrap("cpanelprotect", txt);
}

async function handler(m, { sock } = {}) {
  if (!m.isOwner) {
    return m.reply(raraWrap("cpanelprotect", `Fitur ini hanya untuk owner bot.`));
  }
  if (sock) setGuardSock(sock);
  const args = m.args || (m.text || "").trim().split(/\s+/).filter(Boolean);
  const sub = String(args[0] || "").toLowerCase();
  const p = m.prefix || ".";

  // tanpa arg / settings → status
  if (!sub || sub === "settings" || sub === "status") {
    return m.reply(buildSettings(m));
  }

  // ── guard resource: limit cpu/ram/disk + monitor ──
  if (["guard", "cpu", "ram", "disk", "interval", "action", "cek"].includes(sub)) {
    if (sub === "guard") {
      const val = String(args[1] || "").toLowerCase();
      if (val !== "on" && val !== "off") {
        return m.reply(raraWrap("cpanelprotect", `Format salah.\n\n${p}cpanelprotect guard on/off`));
      }
      setGuardField("enabled", val === "on");
      const sync = syncGuardMonitor();
      return m.reply(
        val === "on"
          ? `Guard resource ${sync.needLimit ? "aktif, TAPI belum ada limit yang diset — pakai ${p}cpanelprotect cpu/ram/disk <batas>" : "aktif 🟢"}\n\nServer yang nekat batas otomatis dimatikan + notif.\n\nCek setting: ${p}cpanelprotect settings`
          : `Guard resource dimatikan 🔴`
      );
    }

    if (sub === "cpu" || sub === "ram" || sub === "disk") {
      const raw = String(args[1] || "").replace(/%$/, "");
      const val = Number(raw);
      if (raw === "" || isNaN(val) || val < 0 || (sub !== "cpu" && val > 100) || (sub === "cpu" && val > 1000)) {
        return m.reply(raraWrap("cpanelprotect", `Batas ${sub} gak valid.\n\n${p}cpanelprotect ${sub} <angka>\n${sub === "cpu" ? "cpu: 0-1000 (% pemakaian, mis. 300)" : sub + ": 0-100 (% dari limit server, mis. 90)"}\n0 = matiin cek ${sub}`));
      }
      const st = setGuardField(sub === "cpu" ? "cpuMax" : sub === "ram" ? "ramMax" : "diskMax", val);
      const sync = syncGuardMonitor();
      return m.reply(
        val === 0
          ? `Limit ${sub} dimatikan ⛔`
          : `Limit ${sub} diset: ${val}${sub === "cpu" ? "%" : "% dari limit"}\n\n${st.enabled ? (sync.running ? "Monitor jalan 🟢 — server nekat batas otomatis dimatikan." : "Guard belum nyala — nyalakan: " + p + "cpanelprotect guard on") : "Guard masih mati — nyalakan: " + p + "cpanelprotect guard on"}`
      );
    }

    if (sub === "interval") {
      const val = Number(String(args[1] || ""));
      if (!val || val < 1 || val > 60) {
        return m.reply(raraWrap("cpanelprotect", `Interval gak valid.\n\n${p}cpanelprotect interval <menit 1-60>`));
      }
      setGuardField("intervalMenit", val);
      syncGuardMonitor();
      return m.reply(`Interval cek guard: tiap ${val} menit.`);
    }

    if (sub === "action") {
      const val = String(args[1] || "").toLowerCase();
      if (val !== "stop" && val !== "kill") {
        return m.reply(raraWrap("cpanelprotect", `Aksi gak valid.\n\n${p}cpanelprotect action stop/kill\nstop = matikan halus, kill = hentikan paksa`));
      }
      setGuardField("action", val);
      return m.reply(`Aksi guard pas nekat batas: ${val === "stop" ? "stop (halus)" : "kill (paksa)"}.`);
    }

    if (sub === "cek") {
      if (!getGuardStatus().enabled) {
        return m.reply(raraWrap("cpanelprotect", `Guard resource masih mati.\n\nNyalain dulu: ${p}cpanelprotect guard on`));
      }
      const res = await runGuardCheck(sock, { ignoreEnabled: true });
      let txt = `HASIL CEK GUARD\n\n`;
      txt += `Diperiksa: ${res.checked} server\n`;
      if (res.skipped) txt += `Dilewati (cooldown): ${res.skipped}\n`;
      if (res.errors) txt += `Gagal dicek: ${res.errors}\n`;
      txt += `Pelanggaran: ${res.violations.length}\n`;
      for (const v of res.violations.slice(0, 10)) {
        txt += `\n${v.name} (${v.username || "-"}) — ${v.kind.toUpperCase()}:\n${v.meteran.join("\n")}\n→ server dimatikan`;
      }
      if (!res.violations.length) txt += `\nSemua aman ✅`;
      return m.reply(raraWrap("cpanelprotect", txt));
    }
  }

  // master on/off
  if (sub === "on" || sub === "off") {
    setMaster(sub === "on");
    const st = protectStatus();
    return m.reply(
      sub === "on"
        ? `Proteksi cpanel diaktifkan 🟢\n\n${st.activeFeatures.length} fitur aktif — cek detail: ${p}cpanelprotect settings`
        : `Proteksi cpanel dimatikan 🔴\n\nSemua aksi panel kembali normal.`
    );
  }

  // <fitur> on/off | all on/off
  const target = sub;
  const action = String(args[1] || "").toLowerCase();
  if (action !== "on" && action !== "off") {
    return m.reply(raraWrap("cpanelprotect", `Format salah.\n\n${p}cpanelprotect <fitur> on/off\nFitur: ${PROTECT_FEATURES.join(", ")}\n\nContoh: ${p}cpanelprotect create off\n\nCek status: ${p}cpanelprotect settings`));
  }
  if (target === "all") {
    setAllFeatures(action === "on");
    return m.reply(`Semua fitur proteksi ${action === "on" ? "diaktifkan ✅" : "dimatikan ⛔"}.\n\nCek detail: ${p}cpanelprotect settings`);
  }
  if (!isFeatureName(target)) {
    return m.reply(raraWrap("cpanelprotect", `Fitur "${target}" gak dikenal.\n\nFitur yang tersedia: ${PROTECT_FEATURES.join(", ")}\n\nCek status: ${p}cpanelprotect settings`));
  }
  setFeature(target, action === "on");
  return m.reply(`Proteksi ${target} ${action === "on" ? "diaktifkan ✅" : "dimatikan ⛔"}.\n\nCek semua: ${p}cpanelprotect settings`);
}

export { handler, pluginConfig, buildSettings };

// CATATAN (8 Okt): default WAJIB OBJECT — `export default handler` bikin loader
// swap namespace ke fungsi handler → pluginConfig hilang → plugin di-skip SENYAP.
export default { config: pluginConfig, handler };
