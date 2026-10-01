// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import tls from "tls";

const pluginConfig = {
  name: "sslcheck",
  alias: ["sslcheck"],
  category: "tools",
  description: "Cek SSL certificate website (issuer, expiry, days left, chain)",
  usage: ".sslcheck <domain>",
  example: ".sslcheck google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function checkSSL(hostname) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
    }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      socket.end();

      if (!cert || Object.keys(cert).length === 0) {
        resolve({ error: "Tidak ada certificate" });
        return;
      }

      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
      const isExpired = now > validTo;
      const isSelfSigned = cert.issuer && cert.subject && 
        JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);

      resolve({
        subject: cert.subject?.CN || cert.subject?.O || "N/A",
        issuer: cert.issuer?.CN || cert.issuer?.O || "N/A",
        issuerOrg: cert.issuer?.O || "N/A",
        validFrom: validFrom.toLocaleDateString("id-ID"),
        validTo: validTo.toLocaleDateString("id-ID"),
        daysLeft,
        isExpired,
        isSelfSigned,
        authorized,
        serialNumber: cert.serialNumber || "N/A",
        fingerprint: cert.fingerprint256 || cert.fingerprint || "N/A",
        san: cert.subjectaltname || "N/A",
      });
    });

    socket.setTimeout(8000);
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ error: "Timeout koneksi" });
    });
    socket.on("error", (e) => {
      resolve({ error: e.message });
    });
  });
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "sslcheck <domain>\n\n" +
        "Cek SSL certificate website (port 443)\n" +
        "Info: issuer, expiry, days left, self-signed, SAN\n\n" +
        "Contoh:\n" +
        prefix + "sslcheck google.com\n" +
        prefix + "sslcheck github.com",
        { title: "SSL Certificate Checker" }
      );
    }

    const domain = text.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!domain) {
      return m.reply(raraWrap("SSL", "Domain tidak boleh kosong!"));
    }
    const result = await checkSSL(domain);

    if (result.error) {
      return m.reply(raraWrap("SSL Error", [
        "Domain: " + domain,
        "Error: " + result.error,
      ].join("\n")));
    }

    const status = result.isExpired ? "EXPIRED" : (result.isSelfSigned ? "SELF-SIGNED" : "VALID");
    const daysLabel = result.daysLeft < 0 ? "Expired " + Math.abs(result.daysLeft) + " hari lalu" : result.daysLeft + " hari lagi";

    // Parse SAN
    let sanList = "N/A";
    if (result.san && result.san !== "N/A") {
      sanList = result.san.replace(/DNS:/g, "").split(",").map((s) => s.trim()).join(", ");
      if (sanList.length > 100) sanList = sanList.substring(0, 100) + "...";
    }
    await m.react("🐣");
    return m.reply(raraWrap("SSL Check: " + domain, [
      "Status: " + status,
      "Subject: " + result.subject,
      "Issuer: " + result.issuer,
      "Issued: " + result.validFrom,
      "Expiry: " + result.validTo,
      "Days left: " + daysLabel,
      "Authorized: " + (result.authorized ? "Yes" : "No"),
      "Self-signed: " + (result.isSelfSigned ? "Yes" : "No"),
      "SAN: " + sanList,
      "Serial: " + (result.serialNumber || "N/A").substring(0, 40),
    ].join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("sslcheck error:", e);
    return m.reply(raraWrap("SSL", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
