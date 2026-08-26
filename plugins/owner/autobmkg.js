// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

/**
 * .autobmkg — konfigurasi scheduler gempa BMKG otomatis (owner only).
 * Default jeda 6 jam: 00:00, 06:00, 12:00, 18:00 WIB.
 */

import {

  getBmkgStatus,
  updateBmkgSettings,
  startBmkgJobs,
  stopBmkgJobs,
} from "../../src/lib/nova-bmkg-scheduler.js";

function claraWrap(title, text) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  const body = Array.isArray(text) ? text.join("\n") : text;
  // Convert body to small caps tapi skip baris command (.xxx) dan preserve *bold*
  const scBody = body.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:")) return line;
    return toSC(line);
  }).join("\n");
  return `❀°˖ ${toSC(title)} ˖°❀\n\n${scBody}`;
}
async function formatAndReply( text, cmdName) {
  const scMap = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  // Convert all text to small caps, skip command lines
  text = text.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:") || line.includes("❀°˖") || line.includes("❀⋆｡˚")) return line;
    return toSC(line);
  }).join("\n");
  if (!text.includes("╰──────────❀")) {
    text = text + "\n\n╰──────────❀";
  }
  return await m.reply(text);
}


const pluginConfig = {
  name: "autobmkg",
  alias: ["autogempa2", "bmkgauto", "gempaotomatis"],
  category: "owner",
  description: "Broadcast gempa BMKG otomatis setiap 6 jam ke grup/saluran",
  usage: ".autobmkg <on/off/add/remove/jadwal/status>",
  example: ".autobmkg on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatSchedule(schedules) {
  return (schedules || [])
    .map((s) => String(s.hour).padStart(2, "0") + ":" + String(s.minute ?? 0).padStart(2, "0"))
    .join(", ");
}

function buildSchedules(args) {
  if (!args.length) return null;
  const schedules = [];
  for (const a of args) {
    const match = a.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    schedules.push({ key: "custom" + h, label: h + ":" + String(m).padStart(2, "0"), hour: h, minute: m });
  }
  return schedules;
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const action = args[0] || "";
    const jid = m.key.remoteJid;

    if (action === "on") {
      const settings = updateBmkgSettings((cur) => ({
        ...cur,
        enabled: true,
        targets: cur.targets.includes(jid) ? cur.targets : [...cur.targets, jid],
      }));
      startBmkgJobs(settings);
      return m.reply(
        "Auto-broadcast BMKG: *ON*\n\n" +
        "Grup ini otomatis ditambah sebagai target.\n" +
        "Jadwal (6 jamanan): " + formatSchedule(settings.schedules) + " WIB\n\n" +
        "Atur jadwal: .autobmkg jadwal 00:00 06:00 12:00 18:00"
      );
    }

    if (action === "off") {
      const settings = updateBmkgSettings((cur) => ({ ...cur, enabled: false }));
      stopBmkgJobs();
      return formatAndReply(claraWrap("Autobmkg", "Auto-broadcast BMKG: *OFF*"));
    }

    if (action === "add") {
      const target = args[1] || jid;
      const settings = updateBmkgSettings((cur) => ({
        ...cur,
        targets: cur.targets.includes(target) ? cur.targets : [...cur.targets, target],
      }));
      if (settings.enabled) startBmkgJobs(settings);
      return m.reply(
        "Target ditambah: " + target + "\n" +
        "Total target: " + settings.targets.length + "\n\n" +
        "Lihat semua: .autobmkg status"
      );
    }

    if (action === "remove" || action === "del") {
      const target = args[1] || jid;
      const settings = updateBmkgSettings((cur) => ({
        ...cur,
        targets: cur.targets.filter((t) => t !== target),
      }));
      if (settings.enabled) startBmkgJobs(settings);
      return m.reply(
        "Target dihapus: " + target + "\n" +
        "Total target: " + settings.targets.length
      );
    }

    if (action === "jadwal" || action === "schedule") {
      const schedules = buildSchedules(args.slice(1));
      if (!schedules) {
        return m.reply(
          "Format jadwal salah.\n" +
          "Contoh: .autobmkg jadwal 00:00 06:00 12:00 18:00\n\n" +
          "Default 6 jamanan: 00:00, 06:00, 12:00, 18:00 WIB"
        );
      }
      const settings = updateBmkgSettings((cur) => ({ ...cur, schedules }));
      if (settings.enabled) startBmkgJobs(settings);
      return m.reply(
        "Jadwal disimpan: " + formatSchedule(schedules) + " WIB\n" +
        "Total " + schedules.length + " kali broadcast per hari"
      );
    }

    if (action === "shakemap" || action === "peta") {
      const val = args[1];
      if (val !== "on" && val !== "off") {
        return m.reply("Format: .autobmkg shakemap <on/off>\nSaat ini: " + (getBmkgStatus().sendShakemap ? "ON" : "OFF"));
      }
      const settings = updateBmkgSettings((cur) => ({ ...cur, sendShakemap: val === "on" }));
      return m.reply("Shakemap (peta gempa): *" + (val === "on" ? "ON" : "OFF") + "*");
    }

    if (action === "minmag") {
      const val = parseFloat(args[1]);
      if (isNaN(val) || val < 0 || val > 10) {
        return m.reply("Format: .autobmkg minmag <0-10>\nSaat ini: M" + (getBmkgStatus().minMagnitude || 0));
      }
      const settings = updateBmkgSettings((cur) => ({ ...cur, minMagnitude: val }));
      return m.reply(
        "Minimum magnitude diset: *M" + val + "*\n" +
        "Gempa di bawah M" + val + " hanya kirim list, tidak kirim shakemap."
      );
    }

    if (action === "test" || action === "cek") {
      // Test fetch gempa terkini
      const { fetchGempaTerkini } = await import("../../src/lib/nova-bmkg-scheduler.js");
      const g = await fetchGempaTerkini();
      let txt = "╭──「 *" + g.Tanggal + "│ ❏\n";
      txt += "╰──────────❀\n\n";
      txt += "Status: *" + (status.enabled ? "ON" : "OFF") + "*\n";
      txt += "Jadwal: " + formatSchedule(status.schedules) + " WIB\n";
      txt += "Min Magnitude: M" + (status.minMagnitude || 0) + "\n";
      txt += "Shakemap: " + (status.sendShakemap ? "ON" : "OFF") + "\n\n";
      txt += "Target (" + status.targets.length + "):\n";
      if (status.targets.length === 0) {
        txt += "(kosong)\n";
      } else {
        for (let i = 0; i < status.targets.length; i++) {
          txt += (i + 1) + ". " + status.targets[i] + "\n";
        }
      }
      txt += "\nPerintah:\n";
      txt += "1. .autobmkg on — Aktifkan\n";
      txt += "2. .autobmkg off — Matikan\n";
      txt += "3. .autobmkg add — Tambah grup ini sebagai target\n";
      txt += "4. .autobmkg remove — Hapus target\n";
      txt += "5. .autobmkg jadwal 00:00 06:00 — Atur jadwal\n";
      txt += "6. .autobmkg shakemap on/off — Toggle peta gempa\n";
      txt += "7. .autobmkg minmag 5.0 — Filter magnitude minimum\n";
      txt += "8. .autobmkg test — Test fetch gempa terkini\n\n";
      txt += "Sumber: data.bmkg.go.id (BMKG resmi)";
      return await m.reply(claraWrap("autobmkg", txt));
    }
  } catch (error) {
    return m.reply("Error: " + error.message);
  }
}

export { pluginConfig as config, handler };
