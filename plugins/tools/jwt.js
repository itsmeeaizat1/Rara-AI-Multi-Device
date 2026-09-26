// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .jwt — decoder JSON Web Token native offline (port altftool.com/tools/all/jwt-decoder)
// Decode header + payload base64url + status kadaluarsa. Signature TIDAK diverifikasi (cuma decode).
import { novaGuideV2, novaSalahV2, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "jwt", alias: ["jwt", "jwtdecode", "decodejwt"], category: "tools",
  description: "Decode token JWT (header + payload + status exp)", usage: ".jwt <token>",
  example: ".jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

const b64urlToJson = (seg) => {
  const norm = seg.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(norm, "base64").toString("utf-8");
  return JSON.parse(json);
};

const fmtWib = (sec) => new Date(sec * 1000).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
const humanDur = (sec) => {
  if (sec < 60) return Math.max(0, Math.floor(sec)) + " dtk";
  if (sec < 3600) return Math.floor(sec / 60) + " mnt";
  if (sec < 86400) return Math.floor(sec / 3600) + " jam";
  return Math.floor(sec / 86400) + " hari";
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const token = (m.text || "").trim();
    if (!token) {
      return m.reply(novaGuideV2("jwt", {
        kaomoji: "(・_・;)",
        sapaan: "token JWT mau didecode? tempel tokennya ya~",
        cara: "ketik .jwt diikuti token JWT lengkap (3 bagian dipisah titik)",
        contoh: `${prefix}jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJ`,
        note: "cuma decode isi token, signature gak diverifikasi — jangan share token rahasia ke siapapun",
        spec: ["⏱ 3dtk", "💸 gratis"],
      }), "jwt");
    }
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[0] || !parts[1]) {
      await m.react("❌");
      return m.reply(novaSalahV2("jwt", {
        kaomoji: "(・_・;)",
        pesan: "format token JWT gak valid — harus 3 bagian dipisah titik: header.payload.signature",
        contoh: `${prefix}jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc`,
      }), "jwt");
    }
    let header, payload;
    try {
      header = b64urlToJson(parts[0]);
      payload = b64urlToJson(parts[1]);
    } catch (e) {
      await m.react("❌");
      return m.reply(novaSalahV2("jwt", {
        kaomoji: "(・_・;)",
        pesan: "bagian header/payload bukan base64 JSON yang valid",
        contoh: `${prefix}jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc`,
      }), "jwt");
    }
    const lines = ["JWT BERHASIL DICODE",
      "",
      `Alg: ${header.alg || "?"} · Typ: ${header.typ || "?"}`];
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp) {
      const diff = payload.exp - now;
      lines.push("", `Exp: ${fmtWib(payload.exp)} WIB`);
      lines.push(diff >= 0 ? `Status: AKTIF (sisa ${humanDur(diff)})` : `Status: KADALUARSA (${humanDur(now - payload.exp)} yang lalu)`);
    }
    if (payload.iat) lines.push(`Iat: ${fmtWib(payload.iat)} WIB`);
    if (payload.nbf) lines.push(`Nbf: ${fmtWib(payload.nbf)} WIB`);
    const interesting = ["sub", "iss", "aud", "name", "email", "role", "scope", "jti"];
    const shown = interesting.filter((k) => payload[k] !== undefined);
    if (shown.length) {
      lines.push("");
      for (const k of shown) lines.push(`${k}: ${String(payload[k]).substring(0, 100)}`);
    }
    let pj = JSON.stringify(payload, null, 2);
    if (pj.length > 900) pj = pj.substring(0, 900) + "\n…(dipotong)";
    lines.push("", "Payload lengkap:", "```" + pj + "```");
    await m.react("🐣");
    await m.reply(claraWrap("JWT Decoder", lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply(claraWrap("JWT Decoder", ["ERROR: " + (e?.message || e)].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };
