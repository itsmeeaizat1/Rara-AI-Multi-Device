// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Formatter kartu status VPS & panel (murni string, gampang dites).

const fmtMB = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
const pct = (u, t) => (t > 0 ? Math.round((u / t) * 100) : 0);

export function maskPw(pw) {
  if (!pw) return "-";
  return pw.length <= 4 ? "••••" : pw[0] + "•".repeat(Math.min(pw.length - 2, 8)) + pw[pw.length - 1];
}

export function legendBlock() {
  return `🟢 jalan normal
🔴 mati / bermasalah (perlu dihidupkan)
⚪ nonaktif tapi memang normal (mis. versi PHP yang tak dipakai)
🟡 status lain / perlu dicek`;
}

export function formatVpsStatus(info, creds, mode) {
  const ramPct = pct(info.ram.used, info.ram.total);
  const swapLine = info.swap.total > 0 ? `\n🔁 Swap: ${fmtMB(info.swap.used)} dipakai / ${fmtMB(info.swap.total)}` : "";
  const disk = info.disk ? `${info.disk.used} dipakai / ${info.disk.total} (${info.disk.pct})` : "-";
  const svc = info.services.map((s) => `${s.icon} ${s.name}${s.icon === "🟢" ? "" : ` — ${s.note}`}`).join("\n");
  const down = info.services.filter((s) => s.icon === "🔴");
  return `🖧 *STATUS VPS* (Mode ${mode})

📡 *Server*
• Hostname : ${info.hostname}
• IP publik: ${info.publicIp}
• OS       : ${info.os}
• Kernel   : ${info.kernel}
• Uptime   : ${info.uptime}

🔐 *Akses login*
• Host : ${creds.host}
• Port : ${creds.port} (SSH aktif di ${info.sshPort})
• User : ${creds.user}
• Pass : ${maskPw(creds.password)}

📊 *Resource* (dipakai / total)
🧠 RAM : ${fmtMB(info.ram.used)} / ${fmtMB(info.ram.total)} (${ramPct}%)${swapLine}
💾 Disk: ${disk}
⚙️ CPU : ${info.cpu.cores} core — load ${info.cpu.load}

🦖 *Panel*
• Status: ${info.panelInstalled ? "✅ terpasang" : "❌ belum ada"}
• URL   : ${info.panelUrl}
• Tema  : ${info.themes.length ? info.themes.join(", ") : "-"}
• PHP   : ${info.phpUsed || "-"}
• Protect: ${info.protectNginx ? "🛡️ aktif" : "⚠️ belum dipasang"}

🔧 *Layanan*
${svc}
${down.length ? `\n⚠️ ${down.length} layanan penting mati: ${down.map((d) => d.name).join(", ")}` : "\n✅ Semua layanan penting jalan"}`;
}

export function formatPanelStatus(ps, creds, mode, p = ".") {
  if (!ps.installed) return `🦖 *STATUS PANEL* (Mode ${mode})\n\n❌ Panel Pterodactyl belum terpasang di VPS ini.\nPasang: ${p}vps panel install <domain>`;
  const adm = ps.admins.length
    ? ps.admins.map((a, i) => `${i + 1}. ${a.username} (#${a.id})\n   ✉️ ${a.email}\n   🔑 2FA: ${a.twofa ? "aktif" : "mati"}`).join("\n")
    : "(belum ada admin)";
  const last = ps.lastLogin.length
    ? ps.lastLogin.map((l) => `• ${l.username}: ${l.ip} (${String(l.ts).slice(0, 16)})`).join("\n")
    : "-";
  const usr = ps.users.length ? ps.users.map((u) => `• ${u.username} (#${u.id}) — ${u.email}`).join("\n") : "-";
  const srv = ps.servers.length
    ? ps.servers.map((s) => `• ${s.name} (#${s.id}) — ${s.owner || "?"} — ${fmtMB(s.memory)} RAM / ${fmtMB(s.disk)} disk — ${s.status}`).join("\n")
    : "-";
  const nodes = ps.nodes.length ? ps.nodes.map((n) => `• ${n.name} (#${n.id}) — ${n.fqdn}:${n.port} — ${fmtMB(n.memory)} RAM`).join("\n") : "-";
  const e = ps.env || {};
  const prot = ps.protectNginx && ps.f2b
    ? `🛡️ AKTIF — rate-limit nginx + fail2ban\n• IP admin di-whitelist: ${ps.whitelist || "-"}\n• IP terbanned: ${ps.banned}`
    : `⚠️ BELUM TERPASANG${ps.protectNginx || ps.f2b ? " lengkap (sebagian)" : ""}\n• Pasang: ${p}vps protect install <id-admin>`;
  const queue = ps.queueActive ? "🟢 pteroq jalan" : `🔴 pteroq MATI — server baru bakal nyangkut "installing"\n   Perbaiki: ${p}statuspanel fixqueue`;
  const failed = ps.failedJobs > 0 ? `\n⚠️ ${ps.failedJobs} job antrian gagal` : "";
  return `🦖 *STATUS PANEL* (Mode ${mode})

📌 *Info panel*
• URL     : ${e.APP_URL || "-"}
• Versi   : ${ps.version}
• Env     : ${e.APP_ENV || "-"} (debug ${e.APP_DEBUG || "-"})
• Database: ${e.DB_DATABASE || "-"} @ user ${e.DB_USERNAME || "-"}
• Host VPS: ${creds.host}:${creds.port} (${creds.user})
• Pass VPS: ${maskPw(creds.password)}

👑 *Admin* (${ps.admins.length})
${adm}

🕒 *Login terakhir admin*
${last}

👥 *User* (${ps.userCount} total, ${ps.users.length} terbaru)
${usr}

🖥️ *Server* (${ps.serverCount} total, ${ps.servers.length} terbaru)
${srv}

🌐 *Node* (${ps.nodes.length})
${nodes}

⚙️ *Antrian*
${queue}${failed}

🛡️ *Protect Panel*
${prot}

🥚 Egg: ${ps.eggCount}${ps.lastBackup ? `\n💾 Backup terakhir: ${ps.lastBackup}` : ""}`;
}
