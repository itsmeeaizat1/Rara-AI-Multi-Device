// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// gantipwvps.js — Ganti password root VPS secara self-service (7 Okt 2026):
// owner request "ganti pw vps bsa untuk user laon yg ingin pw vps diganti".
// Customer yang tercatat sebagai PEMILIK VPS di registry bisa ganti password
// VPS-nya sendiri; owner bot bisa ganti VPS siapa pun.
// Cara kerja: SSH masuk pakai password lama → chpasswd → update registry.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { Client } from "ssh2";
import te from "../../src/lib/rara-error.js";
import {
  findVps,
  isOwnerOf,
  updateVpsPassword,
} from "../../src/lib/rara-vps-registry.js";

let _SshClient = Client;
// seam: inject fake ssh2 Client buat E2E
export function _setSshClientForTest(C) {
  _SshClient = C;
}

const pluginConfig = {
  name: ["gantipwvps", "gantipasswordvps", "resetpwvps"],
  alias: ["gantipwvps", "gantipasswordvps", "resetpwvps"],
  category: "vps",
  description: "Ganti password root VPS milikmu (self-service)",
  usage: ".gantipwvps <id/ip> [password_baru]",
  example: ".gantipwvps 1 | .gantipwvps 103.1.2.3 PassBaru99",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

// password aman buat chpasswd: alnum + simbol amim bukan shell-metachar
const PW_RE = /^[A-Za-z0-9!@#%^&*_\-+=.~]{8,64}$/;

function generatePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function execSSH(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: true }, (err, stream) => {
      if (err) return reject(err);
      let output = "";
      stream.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Command gagal (exit ${code})${output ? ": " + output.trim().slice(0, 120) : ""}`)
          );
        }
        resolve(output);
      });
      stream.on("data", (d) => { output += d.toString(); });
      stream.stderr?.on("data", (d) => { output += d.toString(); });
    });
  });
}

function kartuGantiPw(m, opts) {
  const { ip, oldOwner, newPw, provider } = opts;
  return raraWrap("gantipwvps", [
    "「 ✦ Ganti Password VPS ✦ 」",
    "",
    `IP: ${ip}`,
    `User: root`,
    `Password Baru: ${newPw}`,
    `Provider: ${provider || "manual"}`,
    "",
    oldOwner ? "Password lama udah gak valid — pakai yang baru." : "",
    "",
    "Simpan password ini baik-baik!",
    "_Powered by RARA AI - MULTI DEVICE_",
  ].filter(Boolean).join("\n"));
}

async function handler(m, { sock }) {
  const args = String(m.text || "").trim().split(/\s+/).filter(Boolean);
  const key = args[0];

  if (!key) {
    return m.reply(
      raraWrap("gantipwvps", [
        "「 ✦ Ganti Password VPS ✦ 」",
        "",
        `Cara pakai: ${m.prefix}gantipwvps <id/ip> [password_baru]`,
        "",
        `• ID / IP VPS: bisa dilihat di ${m.prefix}myvps`,
        `• Password baru: opsional — kalau kosong, dibuatkan acak`,
        "",
        "Contoh:",
        `${m.prefix}gantipwvps 1`,
        `${m.prefix}gantipwvps 103.1.2.3 PassBaru99`,
      ].join("\n")),
      "gantipwvps"
    );
  }

  const entry = findVps(key);
  if (!entry) {
    return m.reply(
      raraWrap("gantipwvps", [
        "❌ VPS gak ditemukan",
        "",
        `Cek ID / IP kamu di ${m.prefix}myvps.`,
        "VPS yang baru dibuat via bot otomatis ke-catat di sana.",
      ].join("\n")),
      "gantipwvps"
    );
  }

  const isMine = isOwnerOf(m.sender, entry);
  if (!m.isOwner && !isMine) {
    return m.reply(
      raraWrap("gantipwvps", [
        "🚫 Akses Ditolak",
        "",
        "VPS ini bukan milikmu.",
        "Cuma pemilik VPS atau owner bot yang bisa ganti password-nya.",
      ].join("\n")),
      "gantipwvps"
    );
  }

  let newPw = (args.slice(1).join(" ") || "").trim() || generatePassword();
  if (!PW_RE.test(newPw)) {
    return m.reply(
      raraWrap("gantipwvps", [
        "❌ Password baru gak valid",
        "",
        "Aturan: 8-64 karakter, huruf/angka/simbol aman",
        "(jangan pakai spasi, tanda kutip, $, atau |)",
      ].join("\n")),
      "gantipwvps"
    );
  }

  if (!entry.password) {
    return m.reply(
      raraWrap("gantipwvps", [
        "❌ Password lama VPS ini gak ada di catatan bot.",
        "",
        "Minta owner bot daftarkan ulang VPS-nya supaya bisa self-service.",
      ].join("\n")),
      "gantipwvps"
    );
  }

  await m.react("🕒");

  // chpasswd: password di-quote single biar gak ada injeksi shell
  const cmd = `echo 'root:${newPw}' | chpasswd`;
  const conn = new _SshClient();
  conn
    .on("ready", async () => {
      try {
        await execSSH(conn, cmd);
        updateVpsPassword(entry.id, newPw);
        const card = kartuGantiPw(m, {
          ip: entry.ip,
          oldOwner: true,
          newPw,
          provider: entry.provider,
        });
        // kredensial ke DM biar gak kebaca orang lain di grup
        if (m.isGroup) {
          await sock.sendMessage(m.sender, { text: card });
          await m.reply(
            raraWrap("gantipwvps", "✅ Password VPS diganti. Kartu kredensial dikirim ke DM kamu."),
            "gantipwvps"
          );
        } else {
          await m.reply(card, "gantipwvps");
        }
      } catch (err) {
        console.error("[gantipwvps]", err);
        await m.reply(raraWrap("gantipwvps", te(m.prefix, m.command, m.pushName, err), "error"));
      } finally {
        conn.end();
      }
    })
    .on("error", (err) => {
      console.error("[gantipwvps ssh]", err);
      m.reply(
        raraWrap("gantipwvps", te(m.prefix, m.command, m.pushName, err), "error")
      );
    })
    .connect({
      host: entry.ip,
      port: 22,
      username: "root",
      password: entry.password,
      readyTimeout: 30000,
    });
}

export { pluginConfig as config, handler };
