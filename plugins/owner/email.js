// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .email — kirim & baca email langsung dari WhatsApp (SMTP + IMAP). OWNER-ONLY.
import { novaGuide, novaError, claraWrap } from "../../src/lib/nova-menu-style.js";
import { setEmailConfig, setEmailHosts, getEmailConfig, clearEmailConfig, sendEmail, readEmails, validateEmailAddr } from "../../src/lib/nova-email.js";

const pluginConfig = {
  name: "email",
  alias: ["mail", "emailbot"],
  category: "owner",
  description: "Kirim & baca email langsung dari WhatsApp via SMTP/IMAP",
  usage: ".email set <alamat> <app-password> | .email send <tujuan>|<subjek>|<isi> | .email read [n] | .email host <smtp> <imap> | .email off | .email status",
  example: ".email set aku@gmail.com abcd-efgh-ijkl-mnop",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  limit: 0,
  isEnabled: true,
};

async function handler(m) {
  const rest = String(m.text || "").replace(/^\S+\s*/, "").trim();
  const first = rest.split(/\s+/)[0].toLowerCase();
  try {
    if (first === "set") {
      const parts = rest.replace(/^set\s*/i, "").split(/\s+/);
      const [address, password] = [parts[0], parts[1]];
      const r = setEmailConfig(address, password, parts[2], parts[3]);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(claraWrap("Email", r.ok
        ? "✅ Email siap: " + r.config.address + "\nSMTP: " + r.config.smtpHost + " · IMAP: " + r.config.imapHost + "\n\nCatatan Gmail: wajib pakai App Password (myaccount.google.com → Security → App passwords), bukan password biasa."
        : r.error));
    } else if (first === "host") {
      const parts = rest.replace(/^host\s*/i, "").split(/\s+/);
      const r = setEmailHosts(parts[0], parts[1]);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(claraWrap("Email", r.ok ? "✅ Host SMTP/IMAP diubah" : r.error));
    } else if (first === "send") {
      const payload = rest.replace(/^send\s*/i, "").trim();
      const parts = payload.split("|");
      const [to, subject, ...bodyArr] = [parts[0]?.trim(), parts[1]?.trim(), parts.slice(2).join("|").trim()];
      if (!to || !validateEmailAddr(to) || bodyArr.length === 0 || !bodyArr) {
        await m.react("❌");
        await m.reply(claraWrap("Email", "Format: .email send <tujuan>|<subjek>|<isi pesan>"));
        return { handled: true };
      }
      await m.react("🧠");
      const r = await sendEmail(to, subject, bodyArr);
      await m.react(r.ok ? "⚡" : "❌");
      await m.reply(claraWrap("Email", r.ok ? "✅ Email terkirim ke " + to + (r.id ? "\nID: " + r.id : "") : "Gagal kirim: " + r.error));
    } else if (first === "read") {
      const n = parseInt(rest.replace(/^read\s*/i, "").trim(), 10) || 5;
      await m.react("🧠");
      const r = await readEmails(n);
      if (!r.ok) { await m.react("❌"); await m.reply(claraWrap("Email", r.error)); return { handled: true }; }
      await m.react("⚡");
      await m.reply(claraWrap("Inbox " + (getEmailConfig()?.address || ""), r.mails.length
        ? r.mails.map((x, i) => "【" + (i + 1) + "】 " + x.subject + "\nDari: " + x.from + " · " + x.date + "\n" + (x.snippet || "(kosong)")).join("\n\n")
        : "Inbox kosong atau gak ada email yang kebaca"));
    } else if (first === "off") {
      clearEmailConfig();
      await m.react("⚡");
      await m.reply(claraWrap("Email", "Konfigurasi email dihapus"));
    } else if (first === "status") {
      const cfg = getEmailConfig();
      await m.react("🔍");
      await m.reply(claraWrap("Email", cfg
        ? "Terhubung: " + cfg.address + "\nSMTP: " + cfg.smtpHost + ":" + cfg.smtpPort + "\nIMAP: " + cfg.imapHost + ":" + cfg.imapPort + "\nDiatur: " + String(cfg.setAt || "").slice(0, 19).replace("T", " ")
        : "Belum diatur. Mulai: .email set <alamat> <app-password>"));
    } else {
      await m.react("🐣");
      await m.reply(novaGuide(
        "email",
        "Email automation: kirim & baca email langsung dari chat. SMTP buat kirim, IMAP buat baca inbox (auto-deteksi host Gmail/Outlook/Yahoo).",
        ".email set aku@gmail.com app-password",
        "Kirim: .email send teman@mail.com|Judul|Isi pesan · Baca: .email read 5 · Gmail wajib App Password. Owner-only, kredensial tersimpan di server bot."
      ));
    }
  } catch (error) {
    console.error("[email]:", error.message);
    await m.react("❌");
    await m.reply(novaError("Email", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
