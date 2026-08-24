// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import tls from "tls";

const pluginConfig = {
  name: "certcompare",
  alias: ["sslcompare", "certdiff", "sslcomp", "certcomp"],
  category: "tools",
  description: "Bandingin SSL certificate 2 domain (issuer, expiry, SAN, self-signed)",
  usage: ".certcompare <domain1> <domain2>",
  example: ".certcompare google.com cloudflare.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function checkSSL(hostname) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: hostname, port: 443, servername: hostname, rejectUnauthorized: false,
    }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      socket.end();
      if (!cert || Object.keys(cert).length === 0) {
        resolve({ error: "No certificate" });
        return;
      }
      const validTo = new Date(cert.valid_to);
      const validFrom = new Date(cert.valid_from);
      const now = new Date();
      const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
      const isSelfSigned = cert.issuer && cert.subject &&
        JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);
      resolve({
        subject: cert.subject?.CN || "N/A",
        issuer: cert.issuer?.CN || cert.issuer?.O || "N/A",
        issuerOrg: cert.issuer?.O || "N/A",
        validFrom: validFrom.toLocaleDateString("id-ID"),
        validTo: validTo.toLocaleDateString("id-ID"),
        daysLeft,
        isExpired: now > validTo,
        isSelfSigned,
        authorized,
        san: cert.subjectaltname || "N/A",
        keyBits: cert.bits || "N/A",
        fingerprint: (cert.fingerprint256 || cert.fingerprint || "N/A").substring(0, 40),
      });
    });
    socket.setTimeout(8000);
    socket.on("timeout", () => { socket.destroy(); resolve({ error: "Timeout" }); });
    socket.on("error", (e) => resolve({ error: e.message }));
  });
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "certcompare <domain1> <domain2>\n\n" +
        "Bandingin SSL certificate 2 domain\n" +
        "Info: issuer, expiry, days left, self-signed, key size, SAN\n\n" +
        "Contoh:\n" +
        prefix + "certcompare google.com cloudflare.com\n" +
        prefix + "certcompare github.com gitlab.com",
        { title: "SSL Certificate Comparator" }
      );
    }

    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      return m.reply(claraWrap("CertCompare", "Butuh 2 domain!\nContoh: " + prefix + "certcompare google.com cloudflare.com"));
    }

    const domain1 = parts[0].replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const domain2 = parts[1].replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    await m.react("🕒");

    const [cert1, cert2] = await Promise.all([checkSSL(domain1), checkSSL(domain2)]);

    if (cert1.error || cert2.error) {
      await m.react("❌");
      const lines = [];
      if (cert1.error) lines.push(domain1 + ": Error - " + cert1.error);
      if (cert2.error) lines.push(domain2 + ": Error - " + cert2.error);
      return m.reply(claraWrap("CertCompare Error", lines.join("\n")));
    }

    // Comparison logic
    const sameIssuer = cert1.issuer === cert2.issuer;
    const sameIssuerOrg = cert1.issuerOrg === cert2.issuerOrg;
    const sameKeySize = cert1.keyBits === cert2.keyBits;
    const sameSelfSigned = cert1.isSelfSigned === cert2.isSelfSigned;

    const lines = [
      "Domain A: " + domain1,
      "Domain B: " + domain2,
      "",
      "Subject: " + (cert1.subject === cert2.subject ? "SAME" : "DIFF"),
      "  A: " + cert1.subject,
      "  B: " + cert2.subject,
      "",
      "Issuer: " + (sameIssuer ? "SAME" : "DIFF"),
      "  A: " + cert1.issuer,
      "  B: " + cert2.issuer,
      "",
      "Issuer Org: " + (sameIssuerOrg ? "SAME" : "DIFF"),
      "  A: " + cert1.issuerOrg,
      "  B: " + cert2.issuerOrg,
      "",
      "Valid From:",
      "  A: " + cert1.validFrom,
      "  B: " + cert2.validFrom,
      "",
      "Valid To:",
      "  A: " + cert1.validTo,
      "  B: " + cert2.validTo,
      "",
      "Days Left: " + (cert1.daysLeft === cert2.daysLeft ? "SAME" : "DIFF"),
      "  A: " + cert1.daysLeft + " (" + (cert1.isExpired ? "EXPIRED" : "valid") + ")",
      "  B: " + cert2.daysLeft + " (" + (cert2.isExpired ? "EXPIRED" : "valid") + ")",
      "",
      "Self-Signed: " + (sameSelfSigned ? "SAME" : "DIFF"),
      "  A: " + (cert1.isSelfSigned ? "Yes" : "No"),
      "  B: " + (cert2.isSelfSigned ? "Yes" : "No"),
      "",
      "Key Size: " + (sameKeySize ? "SAME" : "DIFF"),
      "  A: " + cert1.keyBits + " bits",
      "  B: " + cert2.keyBits + " bits",
      "",
      "Authorized:",
      "  A: " + (cert1.authorized ? "Yes" : "No"),
      "  B: " + (cert2.authorized ? "Yes" : "No"),
    ];

    // Summary
    lines.push("");
    const diffs = [];
    if (!sameIssuer) diffs.push("issuer");
    if (!sameIssuerOrg) diffs.push("issuer org");
    if (!sameKeySize) diffs.push("key size");
    if (!sameSelfSigned) diffs.push("self-signed");
    lines.push(diffs.length === 0 ? "Summary: Identical certificate properties" : "Differences: " + diffs.join(", "));

    await m.react("✅");
    return m.reply(claraWrap("CertCompare: " + domain1 + " vs " + domain2, lines.join("\n")));
  } catch (e) {
    console.error("certcompare error:", e);
    await m.react("❌");
    return m.reply(claraWrap("CertCompare", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
