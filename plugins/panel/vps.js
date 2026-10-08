// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// plugins/panel/vps.js — .vps (8 Okt 2026)
// Manajemen VPS & panel Pterodactyl via SSH, KHUSUS DM (data login pribadi).
// 2 MODE:
//   • OWNER — owner pakai VPS yang sudah dia login sendiri (mode owner)
//   • USER  — user lain DITOLAK sampai login akun root VPS-nya sendiri
// Login per-orang & tersimpan terisolasi — akun owner gak bisa dipakai user lain.
import { formatVpsStatus } from "../../src/lib/rara-vps-cards.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  getCreds, saveCreds, clearCreds, maskCreds, testConnection, hostStatus, vpsInfo, pteroqFix,
  panelService, panelInstall, panelUninstall, themeInstall, themeUninstall, themeList,
  changeSshPort, changeRootPw, wingsRestart, wingsSetPort, runScriptUrl,
  protectInstall, protectStatus, protectUninstall, protectBanned,
  THEME_PRESETS, _setVpsStoreForTest,
} from "../../src/lib/rara-vps-manager.js";

const pluginConfig = {
  name: "vps",
  alias: ["vps", "manajemenvps"],
  category: "panel",
  description: "Kelola VPS & panel Pterodactyl via SSH (login root dulu, khusus DM)",
  usage: ".vps",
  example: ".vps login 1.2.3.4|password",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function usageCard(p) {
  return raraWrap("vps",
`🖥️ VPS & PANEL MANAGER
Kelola VPS kamu langsung dari bot — login akun root VPS-mu dulu (tersimpan privat, khusus DM).

🔓 Login / Mode:
• ${p}vps login <ip>|<password> — login VPS (port 22, user root)
• ${p}vps login <ip>|<port>|<user>|<password> — lengkap
• ${p}vps me — lihat data login (password disamarkan)
• ${p}vps logout — hapus data login VPS-mu

📊 Info:
• ${p}vps test — tes koneksi SSH
• ${p}vps status — disk, RAM, layanan, panel & tema terpasang
• ${p}vps exec <perintah> — jalankan perintah shell di VPS-mu

📦 Panel:
• ${p}vps panel install <domain>|<email> — instal panel Pterodactyl (baru)
• ${p}vps panel fix — perbaiki panel (cache, permission, restart layanan)
• ${p}vps panel restart / stop / start
• ${p}vps panel uninstall confirm hapus-panel — uninstal (backup otomatis dulu)

🎨 Tema Panel:
• ${p}vps tema list — daftar tema
• ${p}vps tema install <nama|url> — nama: ${Object.keys(THEME_PRESETS).join(", ")} atau URL .blueprint
• ${p}vps tema uninstall <nama> — balik ke tema bawaan

⚙️ VPS:
• ${p}vps sethost <ip-baru> / setport <port> / setpw <pw-baru> — ubah data login tersimpan
• ${p}vps sshport <port> — ganti port SSH VPS (host ikut diubah)
• ${p}vps rootpw <pw-baru> — ganti password root VPS (login bot ikut diperbarui)
• ${p}vps wings restart — restart wings daemon
• ${p}vps wingsport <port> — ganti port wings
• ${p}vps script <url> — jalankan installer script https

🛡️ Protect Panel:
• ${p}vps protect install <ip-panel>|<pw-vps>|<id-admin> — antibot + fail2ban + whitelist admin
• ${p}vps protect install <id-admin> (kalau sudah login)
• ${p}vps pteroq — hidupkan/perbaiki worker antrian panel (kalau 🔴)
• ${p}statuspanel — info lengkap panel (admin, user, server, node, protect, antrian). Pintasan: ${p}panel status
• ${p}vps protect status / banned / uninstall

⚠️ Semua operasi jalan di VPS MILIKMU SENDIRI. Data login gak bisa dilihat user lain.`);
}

const MODE = (isOwner) => isOwner ? "OWNER" : "USER";

async function handler(m, { sock }) {
  const p = m.prefix || ".";
  if (m.isGroup) {
    return m.reply(raraWrap("vps", `🔒 *Khusus DM*\n\nFitur .vps berisi data login pribadi — chat bot langsung di pesan pribadi.\nMode: *${MODE(m.isOwner)}*`));
  }
  // m.text produksi = isi SETELAH command ("login ip|pw"); jaga-jaga kalau datang lengkap (".vps login ..")
  let raw = (m.text || "").trim();
  raw = raw.replace(/^[^\w\s]?\s*(vps|manajemenvps)\b\s*/i, "");
  const args = raw.split(/\s+/).filter(Boolean);
  const [sub, a2, a3, a4, a5] = args;
  const mode = MODE(m.isOwner);

  // ── login / logout / me: boleh tanpa creds ──
  if (sub === "login") {
    const parts = args.slice(1).join(" ").split("|").map((x) => x?.trim()).filter(Boolean);
    let host, port, user, password;
    if (parts.length === 2) [host, password] = parts;
    else if (parts.length === 4) [host, port, user, password] = parts;
    else return m.reply(raraWrap("vps", `❌ Format login salah.\n\n• ${p}vps login <ip>|<password>\n• ${p}vps login <ip>|<port>|<user>|<password>`));
    if (!/^[\w.-]+(\.[\w-]+)?$/.test(host)) return m.reply(raraWrap("vps", "IP/host gak valid."));
    await m.reply(raraWrap("vps", `⏳ Cek koneksi ke *${host}*…`));
    try {
      const info = await testConnection({ host, port: port || 22, user: user || "root", password });
      saveCreds(m.sender, { host, port: +port || 22, user: user || "root", password });
      return m.reply(raraWrap("vps", `✅ *LOGIN VPS BERHASIL* (Mode ${mode})
Host: ${host}:${+port || 22} (user ${user || "root"})
Server: ${info.hostname} — ${info.os}
Uptime: ${info.uptime}

Sekarang semua fitur .vps jalan di VPS ini.`));
    } catch (e) {
      return m.reply(raraWrap("vps", `❌ Login gagal — ${e.message}\n\nCek IP/port/password root, dan pastikan SSH aktif.`));
    }
  }

  if (sub === "logout") {
    const had = clearCreds(m.sender);
    return m.reply(raraWrap("vps", had ? `🗑️ Data login VPS-mu dihapus dari bot. .vps login buat masuk lagi.` : "Kamu belum login VPS."));
  }

  // ── gate owner-only: status VPS (revisi owner 8 Okt — jgn sampai user lain bisa liat) ──
  if (sub === "status" && !m.isOwner) {
    return m.reply(raraWrap("vps", `🔒 *KHUSUS OWNER*
Status VPS (server, resource, layanan) cuma bisa dilihat owner.

Fitur .vps lain tetap bisa dipakai setelah login VPS-mu sendiri:
• ${p}vps login <ip>|<password>
• ${p}vps test
• ${p}vps sethost / setport / setpw`));
  }

  // ── dari sini wajib sudah login ──
  const creds = getCreds(m.sender);
  if (!creds) {
    return m.reply(raraWrap("vps", `🔒 *BELUM LOGIN VPS* (Mode ${mode})
${m.isOwner ? "Owner belum login VPS — login dulu dengan akun root VPS-mu." : "Fitur ini butuh login akun root VPS-mu sendiri — akun owner gak bisa dipakai."}

• ${p}vps login <ip>|<password>
• ${p}vps login <ip>|<port>|<user>|<password>`));
  }

  if (sub === "me") {
    const c = maskCreds(creds);
    return m.reply(raraWrap("vps", `👤 *DATA LOGIN VPS-MU* (Mode ${mode})
Host: ${c.host}:${c.port}
User: ${c.user}
Password: ${c.password || "-"}
Login ulang kapan pun: ${p}vps login — hapus: ${p}vps logout`));
  }

  if (!sub || sub === "menu") return m.reply(usageCard(p));

  const progress = async (msg) => { try { await m.reply(raraWrap("vps", msg)); } catch {} };

  try {
    // ── tes & status ──
    if (sub === "test") {
      const info = await testConnection(creds);
      return m.reply(raraWrap("vps", `✅ *KONEKSI OK* (Mode ${mode})\nServer: ${info.hostname} — ${info.os}\nUptime: ${info.uptime}`));
    }
    if (sub === "status") {
      const info = await vpsInfo(creds);
      return m.reply(raraWrap("vps", formatVpsStatus(info, creds, mode)));
    }
    if (sub === "pteroq") {
      await progress("🔧 Periksa & hidupkan pteroq (worker antrian panel)…");
      const r = await pteroqFix(creds);
      return m.reply(raraWrap("vps", r.active
        ? `✅ *pteroq JALAN*${r.created ? " (unit systemd dibuat baru, enable otomatis saat boot)" : " (di-restart)"}\nServer baru sekarang bisa selesai install.`
        : "❌ pteroq masih belum aktif. Cek log: " + p + "vps exec journalctl -u pteroq -n 20 --no-pager"));
    }
    if (sub === "exec") {
      const cmd = args.slice(1).join(" ");
      if (!cmd) return m.reply(raraWrap("vps", `Perintahnya mana? Contoh: ${p}vps exec df -h`));
      const r = await import("../../src/lib/rara-vps-manager.js").then((l) => l.sshExec?.(creds, cmd, { timeoutMs: 60000 }));
      if (!r || r.code !== 0) return m.reply(raraWrap("vps", `❌ exit ${r?.code ?? "?"}\n${(r?.stderr || r?.stdout || "gak ada output").slice(-800)}`));
      return m.reply(raraWrap("vps", `⌨️ *EXEC* (Mode ${mode})\n\`\`\`\n${(r.stdout || "(tanpa output)").slice(-1500)}\n\`\`\``));
    }

    // ── panel ──
    if (sub === "panel") {
      const act = (a2 || "").toLowerCase();
      if (act === "install") {
        const [domain, email] = (a3 || "").split("|").map((x) => x?.trim());
        await progress("📦 Instal panel dimulai — ±5–15 menit. Tunggu kabar berikutnya…");
        const r = await panelInstall(creds, { domain, email }, () => {});
        return m.reply(raraWrap("vps", `✅ *PANEL TERPASANG*\nURL: ${r.url}\n\n${r.note}`));
      }
      if (act === "uninstall") {
        const rest = args.slice(2).join(" ");
        const backup = !/\bnobackup\b/.test(rest);
        await progress("🗑️ Uninstal panel — backup + pembersihan… (±1–3 menit)");
        const r = await panelUninstall(creds, { confirm: (rest.match(/confirm\s+(\S+)/) || [])[1], backup }, () => {});
        return m.reply(raraWrap("vps", `✅ *PANEL DI-UNINSTAL*\n${r.note}`));
      }
      if (["fix", "restart", "stop", "start"].includes(act)) {
        if (act === "fix") await progress("🔧 Panel fix jalan — permission, cache, migrate, restart layanan…");
        const r = await panelService(creds, act === "fix" ? "fix" : act);
        const extra = act === "fix" ? `\nHTTP 127.0.0.1: ${r.httpCode} (200 = sehat)\nnginx: ${r.nginxTest}` : "";
        return m.reply(raraWrap("vps", `✅ *PANEL ${act.toUpperCase()}*${extra}`));
      }
      return m.reply(raraWrap("vps", `Sub panel gak dikenal. Pakai: ${p}vps panel install|fix|restart|stop|start|uninstall`));
    }

    // ── tema ──
    if (sub === "tema" || sub === "theme") {
      const act = (a2 || "").toLowerCase();
      if (act === "list") return m.reply(raraWrap("vps", `🎨 *TEMA PANEL*\n\`\`\`\n${await themeList(creds)}\n\`\`\``));
      if (act === "install" || act === "pasang") {
        const nama = a3;
        if (!nama) return m.reply(raraWrap("vps", `Nama tema mana? Preset: ${Object.keys(THEME_PRESETS).join(", ")} — atau URL file .blueprint`));
        await progress(`🎨 Instal tema *${nama}*… (±1–5 menit)`);
        const r = await themeInstall(creds, nama, () => {});
        return m.reply(raraWrap("vps", `✅ *TEMA ${r.nama} DIPASANG*\n${r.log}\n\nKalau tampilan belum berubah: ${p}vps panel fix`));
      }
      if (act === "uninstall" || act === "hapus") {
        if (!a3) return m.reply(raraWrap("vps", `Nama temanya mana? Lihat daftar: ${p}vps tema list`));
        const r = await themeUninstall(creds, a3);
        return m.reply(raraWrap("vps", `✅ *TEMA ${r.nama} DIHAPUS* — balik ke tema bawaan\n${r.log}\n\n${r.note}`));
      }
      return m.reply(raraWrap("vps", `Sub tema gak dikenal. Pakai: ${p}vps tema list|install|uninstall`));
    }

    // ── protect panel ──
    if (sub === "protect") {
      const act = (a2 || "").toLowerCase();
      if (act === "install") {
        let adminId = a3;
        if (adminId && !args.slice(1).join(" ").includes("|")) {
          // format: .vps protect install <adminId> — pakai login tersimpan
        } else {
          // format: .vps protect install <ip-panel>|<pw-vps>|<id-admin> — inline
          const parts = args.slice(2).join(" ").split("|").map((x) => x?.trim()).filter(Boolean);
          if (parts.length !== 3) return m.reply(raraWrap("vps", `Format salah. Pakai salah satu:\n• ${p}vps protect install <ip-panel>|<pw-vps>|<id-admin>\n• ${p}vps protect install <id-admin> (kalau sudah .vps login)`));
          [adminId] = parts.slice(2);
          await m.reply(raraWrap("vps", `⏳ Cek akses VPS *${parts[0]}*…`));
          await testConnection({ host: parts[0], port: 22, user: "root", password: parts[1] });
          saveCreds(m.sender, { host: parts[0], port: 22, user: "root", password: parts[1] });
        }
        if (!adminId) return m.reply(raraWrap("vps", `ID admin utama panel-nya mana? ${p}vps protect install <ip-panel>|<pw-vps>|<id-admin>`));
        await progress("🛡️ Instal protect panel: fail2ban + rate-limit login + whitelist admin (±1–3 menit)…");
        const r = await protectInstall(getCreds(m.sender), { adminId }, () => {});
        return m.reply(raraWrap("vps", `✅ *PROTECT PANEL AKTIF* (Mode ${mode})
Whitelist admin: ${r.adminIp} (ID ${adminId})

• Rate limit: login 10x/menit + API 120x/menit (admin bebas limit)
• fail2ban: 6x gagal login = ban 1 jam (panel + SSH 4x)
• Admin gak akan ke-ban / ke-limit (IP terakhir dari log panel)

Status: ${p}vps protect status — lepas: ${p}vps protect uninstall`));
      }
      if (act === "status") {
        const st = await protectStatus(getCreds(m.sender));
        return m.reply(raraWrap("vps", `🛡️ *PROTECT PANEL STATUS*
Snippet rate-limit: ${st.SNIPPET || "-"} | fail2ban: ${st.F2B || "-"}
Whitelist admin: ${st.WHITELIST || "-"}
Terbanned (panel): ${st.BANNED || "0"} | Terbanned (SSH): ${st.SSHD_BANNED || "0"}`));
      }
      if (act === "banned") {
        return m.reply(raraWrap("vps", `🚫 *IP TERBANNED*\n\`\`\`\n${await protectBanned(getCreds(m.sender))}\n\`\`\``));
      }
      if (act === "uninstall") {
        await progress("🔓 Lepas protect panel (rate-limit + fail2ban dinonaktif)…");
        await protectUninstall(getCreds(m.sender), () => {});
        return m.reply(raraWrap("vps", "✅ Protect panel dilepas — panel balik normal tanpa limit."));
      }
      return m.reply(raraWrap("vps", `Sub protect gak dikenal. Pakai: ${p}vps protect install|status|banned|uninstall`));
    }

    // ── sethost/setport/setpw (data login) ──
    if (sub === "sethost") {
      if (!a2) return m.reply(raraWrap("vps", `IP/host barunya mana? Contoh: ${p}vps sethost 103.1.2.3`));
      saveCreds(m.sender, { host: a2 });
      return m.reply(raraWrap("vps", `✅ Host login diperbarui: *${a2}*. (${p}vps test buat cek)`));
    }
    if (sub === "setport") {
      if (!/^\d+$/.test(a2 || "")) return m.reply(raraWrap("vps", `Port harus angka. Contoh: ${p}vps setport 2222`));
      saveCreds(m.sender, { port: +a2 });
      return m.reply(raraWrap("vps", `✅ Port login diperbarui: *${a2}*.`));
    }
    if (sub === "setpw") {
      if (!a2) return m.reply(raraWrap("vps", `Password barunya mana? Contoh: ${p}vps setpw PassBaru123`));
      saveCreds(m.sender, { password: args.slice(1).join(" ") });
      return m.reply(raraWrap("vps", `✅ Password login diperbarui. (${p}vps test buat cek)`));
    }

    // ── operasi host nyata ──
    if (sub === "sshport") {
      if (!/^\d+$/.test(a2 || "")) return m.reply(raraWrap("vps", `Port harus angka 1-65535. Contoh: ${p}vps sshport 2222`));
      await progress(`⚙️ Ganti port SSH jadi *${a2}* — login bot ikut diperbarui…`);
      const r = await changeSshPort(creds, a2, () => {});
      saveCreds(m.sender, { port: r.port });
      return m.reply(raraWrap("vps", `✅ Port SSH VPS sekarang *${r.port}* — data login bot sudah cocok otomatis.`));
    }
    if (sub === "rootpw") {
      const pw = args.slice(1).join(" ");
      if (!pw || pw.length < 6) return m.reply(raraWrap("vps", `Password minimal 6 karakter. Contoh: ${p}vps rootpw PassBaru123`));
      await progress("⚙️ Ganti password root VPS — data login bot ikut diperbarui…");
      await changeRootPw(creds, pw, () => {});
      saveCreds(m.sender, { password: pw });
      return m.reply(raraWrap("vps", `✅ Password root VPS diganti — login bot sudah diperbarui otomatis.`));
    }
    if (sub === "wings") {
      const act = (a2 || "").toLowerCase();
      if (act === "restart") return m.reply(raraWrap("vps", `✅ Wings restart:\n\`\`\`\n${await wingsRestart(creds)}\n\`\`\``));
      if (act === "port") {
        if (!/^\d+$/.test(a3 || "")) return m.reply(raraWrap("vps", `Port-nya mana? Contoh: ${p}vps wings port 443`));
        const out = await wingsSetPort(creds, a3, () => {});
        return m.reply(raraWrap("vps", `✅ Port wings diganti:\n\`\`\`\n${out}\n\`\`\`\nPanel (node) ikut di-update daemonListen.`));
      }
      return m.reply(raraWrap("vps", `Sub wings gak dikenal. Pakai: ${p}vps wings restart|port <n>`));
    }
    if (sub === "script") {
      if (!/^https:\/\//.test(a2 || "")) return m.reply(raraWrap("vps", `URL https installer script-nya mana? Contoh: ${p}vps script https://.../install.sh`));
      const out = await runScriptUrl(creds, a2, () => {});
      return m.reply(raraWrap("vps", `📜 *SCRIPT SELESAI*\n\`\`\`\n${out.slice(-900)}\n\`\`\``));
    }

    return m.reply(usageCard(p));
  } catch (e) {
    return m.reply(raraWrap("vps", `❌ *GAGAL*\n\n${e.message}\n\nCek ${p}vps test — kalau SSH gak nyambung, login ulang: ${p}vps login`));
  }
}

export { pluginConfig as config, handler };
