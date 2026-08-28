// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// Temp Email Plugin - Multi Provider (5 Providers)
// Mail.tm, Mail.gw, Guerrilla Mail, Mailporary, TempMail.io
// Custom name supported by: mailtm, mailgw, guerrilla, mailporary
// Auto-generate: tempmailio (custom name not supported)
// ============================================================

const PROVIDERS = {
  mailtm: {
    name: "Mail.tm",
    api: "https://api.mail.tm",
    type: "jwt",
    customName: true,
  },
  mailgw: {
    name: "Mail.gw",
    api: "https://api.mail.gw",
    type: "jwt",
    customName: true,
  },
  guerrilla: {
    name: "Guerrilla Mail",
    api: "https://api.guerrillamail.com/ajax.php",
    type: "guerrilla",
    customName: true,
  },
  mailporary: {
    name: "Mailporary",
    alias: ["Mail.tm"],
    api: "https://web.mailporary.com/api/v1",
    type: "mailporary",
    customName: true,
  },
  tempmailio: {
    name: "TempMail.io",
    api: "https://api.internal.temp-mail.io/api/v3",
    type: "tempmailio",
    customName: false,
  },
  anonymmail: {
    name: "AnonymMail",
    api: "https://anonymmail.net",
    type: "anonymmail",
    customName: true,
  },
};

// Active sessions per user
const sessions = new Map();

const pluginConfig = {
  name: ["tempmail", "mailtmp", "tmpmail", "mailtemp"],
  alias: ["tempmail", "mailtmp", "tmpmail", "mailtemp"],
  category: "tools",
  description: "Email sementara multi-provider dengan custom name",
  usage: ".tempmail create <nama> [provider] | .tempmail inbox | .tempmail read <no> | .tempmail delete | .tempmail list",
  example: ".tempmail create aizat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 2,
  isEnabled: true,
};

// === Helpers ===

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pwd = "";
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

function cleanName(text) {
  return text.toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

// === Mail.tm / Mail.gw (JWT type) ===

async function jwtGetDomains(apiBase) {
  const res = await axios.get(`${apiBase}/domains`, { timeout: 10000 });
  const domains = res.data["hydra:member"] || [];
  return domains.filter((d) => d.isActive).map((d) => d.domain);
}

async function jwtCreateAccount(apiBase, address, password) {
  const res = await axios.post(
    `${apiBase}/accounts`,
    { address, password },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  return res.data;
}

async function jwtGetToken(apiBase, address, password) {
  const res = await axios.post(
    `${apiBase}/token`,
    { address, password },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  return { token: res.data.token, id: res.data.id };
}

async function jwtGetMessages(apiBase, token) {
  const res = await axios.get(`${apiBase}/messages?page=1`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });
  return res.data["hydra:member"] || [];
}

async function jwtGetMessage(apiBase, token, msgId) {
  const res = await axios.get(`${apiBase}/messages/${msgId}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });
  return res.data;
}

async function jwtDeleteAccount(apiBase, token, accountId) {
  try {
    await axios.delete(`${apiBase}/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

// === Guerrilla Mail ===

async function guerrillaSetEmail(user) {
  const res = await axios.get(
    `${PROVIDERS.guerrilla.api}?f=set_email_user&email_user=${encodeURIComponent(user)}`,
    { timeout: 10000 }
  );
  return res.data;
}

async function guerrillaGetInbox(sidUser) {
  const res = await axios.get(
    `${PROVIDERS.guerrilla.api}?f=get_email_list&offset=0&sid_user=${sidUser}`,
    { timeout: 10000 }
  );
  return res.data.list || [];
}

async function guerrillaGetMessage(sidUser, emailId) {
  const res = await axios.get(
    `${PROVIDERS.guerrilla.api}?f=fetch_email&email_id=${emailId}&sid_user=${sidUser}`,
    { timeout: 10000 }
  );
  return res.data;
}

async function guerrillaDeleteEmail(sidUser) {
  try {
    await axios.get(
      `${PROVIDERS.guerrilla.api}?f=del_email&email_ids[]=0&sid_user=${sidUser}`,
      { timeout: 10000 }
    );
    return true;
  } catch {
    return false;
  }
}

// === Mailporary ===

async function mailporaryGetToken() {
  const res = await axios.get("https://mailporary.com/id", {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = res.data;
  const match = html.match(/__NUXT_DATA__">(.*?)<\/script>/s);
  if (!match) throw new Error("Failed to get mailporary token");
  const arr = JSON.parse(match[1]);
  for (const item of arr) {
    if (typeof item === "string" && item.startsWith("eyJ") && item.length > 50) {
      return { token: item };
    }
  }
  throw new Error("Mailporary token not found");
}

async function mailporaryGetDomains(token) {
  const res = await axios.get("https://mailporary.com/id", {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = res.data;
  const match = html.match(/__NUXT_DATA__">(.*?)<\/script>/s);
  if (!match) return [];
  const arr = JSON.parse(match[1]);
  const domains = [];
  for (const item of arr) {
    if (typeof item === "string" && /^\w+\.(com|net|org)$/.test(item)) {
      domains.push(item);
    }
  }
  return domains;
}

async function mailporaryGetMessages(token, mailboxName) {
  const res = await axios.get(`${PROVIDERS.mailporary.api}/mailbox/${encodeURIComponent(mailboxName)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Request-ID": Math.random().toString(36).slice(2),
      "X-Timestamp": Math.floor(Date.now() / 1000).toString(),
    },
    timeout: 10000,
  });
  return res.data || [];
}

async function mailporaryGetMessage(token, mailboxName, msgId) {
  const res = await axios.get(
    `${PROVIDERS.mailporary.api}/mailbox/${encodeURIComponent(mailboxName)}/${msgId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-ID": Math.random().toString(36).slice(2),
        "X-Timestamp": Math.floor(Date.now() / 1000).toString(),
      },
      timeout: 10000,
    }
  );
  return res.data;
}

async function mailporaryDeleteMailbox(token, mailboxName) {
  try {
    await axios.delete(`${PROVIDERS.mailporary.api}/mailbox/${encodeURIComponent(mailboxName)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-ID": Math.random().toString(36).slice(2),
        "X-Timestamp": Math.floor(Date.now() / 1000).toString(),
      },
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

// === TempMail.io ===

async function tempmailioCreate() {
  const res = await axios.post(
    `${PROVIDERS.tempmailio.api}/email/new`,
    { min_name_length: 10, max_name_length: 20 },
    { headers: { "Content-Type": "application/json" }, timeout: 10000 }
  );
  return { email: res.data.email, token: res.data.token };
}

async function tempmailioGetMessages(email, token) {
  const res = await axios.get(`${PROVIDERS.tempmailio.api}/email/${email}/messages`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 10000,
  });
  return res.data || [];
}

async function tempmailioGetMessage(email, token, msgId) {
  const res = await axios.get(`${PROVIDERS.tempmailio.api}/email/${email}/messages/${msgId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 10000,
  });
  return res.data;
}


// === AnonymMail ===

async function anonymmailGetDomains() {
  const res = await axios.post(`${PROVIDERS.anonymmail.api}/api/getDomains`, {}, {
    timeout: 10000,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return (res.data || []).map((d) => d.domain);
}

async function anonymmailCreate(address) {
  const res = await axios.post(`${PROVIDERS.anonymmail.api}/api/create`, `email=${encodeURIComponent(address)}`, {
    timeout: 10000,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

async function anonymmailGetInbox(address) {
  const res = await axios.post(`${PROVIDERS.anonymmail.api}/api/get`, `email=${encodeURIComponent(address)}`, {
    timeout: 10000,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.data || res.data.length === 0) return [];
  const emails = res.data[address] || res.data.emails || [];
  return emails;
}

async function anonymmailDelete(address) {
  try {
    const res = await axios.post(`${PROVIDERS.anonymmail.api}/api/delete`, `email=${encodeURIComponent(address)}`, {
      timeout: 10000,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data?.success || false;
  } catch {
    return false;
  }
}

// === Unified Provider Functions ===

async function providerCreate(providerKey, name) {
  const provider = PROVIDERS[providerKey];

  if (provider.type === "jwt") {
    const domains = await jwtGetDomains(provider.api);
    if (domains.length === 0) throw new Error("No domain available");
    const domain = domains[0];
    const address = `${name}@${domain}`;
    const password = generatePassword();

    let account;
    try {
      account = await jwtCreateAccount(provider.api, address, password);
    } catch (err) {
      const msg = err.response?.data?.["hydra:description"] || err.response?.data?.message || "";
      if (msg.includes("already") || msg.includes("exists") || err.response?.status === 422) {
        return { error: "exists", address };
      }
      throw err;
    }

    const { token, id } = await jwtGetToken(provider.api, address, password);
    return { address, password, token, accountId: id, provider: providerKey };
  }

  if (provider.type === "guerrilla") {
    const data = await guerrillaSetEmail(name);
    if (data.error) return { error: "exists", address: `${name}@guerrillamail.com` };
    return {
      address: data.email_addr,
      password: "-",
      sidUser: data.sid_user || "",
      provider: providerKey,
    };
  }

  if (provider.type === "mailporary") {
    const { token } = await mailporaryGetToken();
    const domains = await mailporaryGetDomains(token);
    const domain = domains.length > 0 ? domains[0] : "suarj.com";
    const address = `${name}@${domain}`;
    // Mailporary doesn't require account creation - any mailbox name works
    // Just store the name and token
    return {
      address,
      password: "-",
      token,
      mailboxName: name,
      provider: providerKey,
    };
  }

  if (provider.type === "tempmailio") {
    const data = await tempmailioCreate();
    return {
      address: data.email,
      password: "-",
      token: data.token,
      provider: providerKey,
    };
  }

  if (provider.type === "anonymmail") {
    const domains = await anonymmailGetDomains();
    if (domains.length === 0) throw new Error("No domain available");
    const domain = domains[0];
    const address = `${name}@${domain}`;
    const result = await anonymmailCreate(address);
    if (!result.success) {
      return { error: "exists", address };
    }
    return {
      address,
      password: "-",
      provider: providerKey,
    };
  }

  throw new Error("Unknown provider type");
}

async function providerGetInbox(session) {
  const provider = PROVIDERS[session.provider];

  if (provider.type === "jwt") {
    const messages = await jwtGetMessages(provider.api, session.token);
    return messages.map((m) => ({
      id: m.id,
      from: m.from?.address || "Unknown",
      fromName: m.from?.name || "-",
      subject: m.subject || "(No subject)",
      time: m.createdAt,
      seen: m.seen,
    }));
  }

  if (provider.type === "guerrilla") {
    const list = await guerrillaGetInbox(session.sidUser);
    return list.map((m) => ({
      id: m.mail_id,
      from: m.mail_from,
      fromName: m.mail_from,
      subject: m.mail_subject || "(No subject)",
      time: m.mail_date ? new Date(m.mail_date * 1000).toISOString() : new Date().toISOString(),
      seen: m.mail_read === 1,
    }));
  }

  if (provider.type === "mailporary") {
    // Refresh token if needed (tokens expire in ~24h)
    let token = session.token;
    const messages = await mailporaryGetMessages(token, session.mailboxName);
    return messages.map((m) => ({
      id: m.id || m._id,
      from: m.from || m.sender || "Unknown",
      fromName: m.from_name || m.from || "-",
      subject: m.subject || "(No subject)",
      time: m.date || m.created_at || new Date().toISOString(),
      seen: m.seen || false,
    }));
  }

  if (provider.type === "tempmailio") {
    const messages = await tempmailioGetMessages(session.address, session.token);
    return messages.map((m) => ({
      id: m.id,
      from: m.from || "Unknown",
      fromName: m.from || "-",
      subject: m.subject || "(No subject)",
      time: m.created_at || new Date().toISOString(),
      seen: m.seen || false,
    }));
  }

  if (provider.type === "anonymmail") {
    const emails = await anonymmailGetInbox(session.address);
    return emails.map((m) => ({
      id: m.token,
      from: m.from || "Unknown",
      fromName: m.from || "-",
      subject: m.subject || "(No subject)",
      time: m.date || new Date().toISOString(),
      seen: m.read || false,
    }));
  }

  return [];
}

async function providerGetMessage(session, msgId) {
  const provider = PROVIDERS[session.provider];

  if (provider.type === "jwt") {
    const full = await jwtGetMessage(provider.api, session.token, msgId);
    return {
      from: full.from?.address || "Unknown",
      fromName: full.from?.name || "-",
      subject: full.subject || "(No subject)",
      time: full.createdAt,
      text: full.text || full.intro || "(No content)",
      html: full.html || "",
    };
  }

  if (provider.type === "guerrilla") {
    const full = await guerrillaGetMessage(session.sidUser, msgId);
    return {
      from: full.mail_from || "Unknown",
      fromName: full.mail_from || "-",
      subject: full.mail_subject || "(No subject)",
      time: full.mail_date ? new Date(full.mail_date * 1000).toISOString() : new Date().toISOString(),
      text: full.mail_body || "(No content)",
      html: full.mail_body || "",
    };
  }

  if (provider.type === "mailporary") {
    const full = await mailporaryGetMessage(session.token, session.mailboxName, msgId);
    return {
      from: full.from || full.sender || "Unknown",
      fromName: full.from_name || full.from || "-",
      subject: full.subject || "(No subject)",
      time: full.date || full.created_at || new Date().toISOString(),
      text: full.text || full.body || full.html || "(No content)",
      html: full.html || "",
    };
  }

  if (provider.type === "tempmailio") {
    const full = await tempmailioGetMessage(session.address, session.token, msgId);
    return {
      from: full.from || "Unknown",
      fromName: full.from || "-",
      subject: full.subject || "(No subject)",
      time: full.created_at || new Date().toISOString(),
      text: full.body || full.text || "(No content)",
      html: full.html || "",
    };
  }

  if (provider.type === "anonymmail") {
    // AnonymMail includes body in the inbox response, so we re-fetch inbox
    const emails = await anonymmailGetInbox(session.address);
    const msg = emails.find((e) => e.token === msgId);
    if (!msg) return null;
    return {
      from: msg.from || "Unknown",
      fromName: msg.from || "-",
      subject: msg.subject || "(No subject)",
      time: msg.date || new Date().toISOString(),
      text: msg.body || msg.text || "(No content)",
      html: msg.body || "",
    };
  }

  return null;
}

async function providerDelete(session) {
  const provider = PROVIDERS[session.provider];

  if (provider.type === "jwt") {
    return jwtDeleteAccount(provider.api, session.token, session.accountId);
  }

  if (provider.type === "guerrilla") {
    return guerrillaDeleteEmail(session.sidUser);
  }

  if (provider.type === "mailporary") {
    return mailporaryDeleteMailbox(session.token, session.mailboxName);
  }

  if (provider.type === "tempmailio") {
    // TempMail.io doesn't have a delete endpoint - just clear session
    return true;
  }

  if (provider.type === "anonymmail") {
    return anonymmailDelete(session.address);
  }

  return false;
}

// === Handler ===

async function handler(m, { sock }) {
  const sub = (m.text || "").split(" ")[0]?.toLowerCase();
  const arg = (m.text || "").slice(sub.length).trim();

  // === CREATE ===
  if (sub === "create" || sub === "new" || sub === "buat") {
    const parts = arg.split(/\s+/);
    const name = cleanName(parts[0] || "");
    let providerKey = parts[1]?.toLowerCase() || "mailtm";

    if (!PROVIDERS[providerKey]) {
      const validKeys = Object.keys(PROVIDERS).join(", ");
      return m.reply(
        claraWrap("Temp Email", `Provider "${providerKey}" tidak ada!\nTersedia: ${validKeys}\n\n💡 *Contoh:* ${m.prefix}tempmail create aizat mailtm`)
      );
    }

    // TempMail.io doesn't support custom name
    if (PROVIDERS[providerKey].customName === false) {
      await m.react("🕒");
      try {
        const result = await providerCreate(providerKey);
        sessions.set(m.sender, { ...result, createdAt: Date.now() });
        await m.react("🐣");
        const body = `Berhasil dibuat!\n\nProvider: ${PROVIDERS[result.provider].name}\nEmail: ${result.address}\nStatus: Aktif\n\nKirim email ke alamat di atas, lalu cek:\n${m.prefix}tempmail inbox\n\nNote: ${PROVIDERS[result.provider].name} auto-generate email, tidak support custom name.`;
        return m.reply( claraWrap("Temp Email", body), "tempmail");
      } catch (err) {
        return m.reply(claraWrap("Mail.tm", te(m.prefix, m.command, m.pushName), "error"));
      }
    }

    if (!name || name.length < 3) {
    await m.reply(claraWrap(
          "Temp Email",
          `Cara pakai:\n${m.prefix}tempmail create <nama> [provider]\n\nContoh:\n${m.prefix}tempmail create aizat\n${m.prefix}tempmail create aizat mailgw\n${m.prefix}tempmail create aizat guerrilla\n${m.prefix}tempmail create aizat mailporary\n\nNama: min 3 karakter (huruf, angka, . _ -)\n\nProvider:\n1. mailtm (default)\n2. mailgw\n3. guerrilla\n4. mailporary\n5. tempmailio (auto-generate)`
        ));
    }

    await m.react("🕒");

    try {
      const result = await providerCreate(providerKey, name);

      if (result.error === "exists") {
        return m.reply(
          claraWrap(
            "Temp Email",
            `Email "${result.address}" sudah dipakai!\nCoba nama lain atau ganti provider.\n\nContoh:\n${m.prefix}tempmail create ${name}99\n${m.prefix}tempmail create ${name} mailgw`
          )
        );
      }

      sessions.set(m.sender, { ...result, createdAt: Date.now() });
      await m.react("🐣");

      const providerName = PROVIDERS[result.provider].name;
      const pwdLine = result.password !== "-" ? `\nPassword: ${result.password}` : "";
      const body = `Berhasil dibuat!\n\nProvider: ${providerName}\nEmail: ${result.address}${pwdLine}\nStatus: Aktif\n\nKirim email ke alamat di atas, lalu cek:\n${m.prefix}tempmail inbox`;

      return m.reply( claraWrap("Temp Email", body), "tempmail");
    } catch (err) {
      return m.reply(claraWrap("Mail.tm", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  // === INBOX ===
  if (sub === "inbox" || sub === "cek" || sub === "pesan") {
    const session = sessions.get(m.sender);
    if (!session) {
      return m.reply(
        claraWrap("Temp Email", `Belum punya email sementara!\nKetik: ${m.prefix}tempmail create <nama>`)
      );
    }

    await m.react("🕒");

    try {
      const messages = await providerGetInbox(session);

      if (messages.length === 0) {
        await m.react("🐣");
        return m.reply(
          claraWrap(
            "Temp Email",
            `Email: ${session.address}\nProvider: ${PROVIDERS[session.provider].name}\n\nTidak ada pesan masuk.\nTunggu email masuk lalu cek lagi.`
          )
        );
      }

      let list = `Email: ${session.address}\nProvider: ${PROVIDERS[session.provider].name}\n\nTotal: ${messages.length} pesan\n\n`;
      messages.forEach((msg, i) => {
        const isNew = !msg.seen ? " (Baru)" : "";
        list += `${i + 1}. ${msg.subject}${isNew}\n   Dari: ${msg.from}\n   ${timeAgo(msg.time)}\n\n`;
      });
      list += `Baca pesan: ${m.prefix}tempmail read <nomor>`;
      list += `\nBaca semua: ${m.prefix}tempmail read all`;

      await m.react("🐣");
      return m.reply( claraWrap("Temp Email Inbox", list), "tempmail");
    } catch (err) {
      if (err.response?.status === 401) {
        sessions.delete(m.sender);
        return m.reply(
          claraWrap("Temp Email", `Session expired!\nBuat baru: ${m.prefix}tempmail create <nama>`)
        );
      }
      return m.reply(claraWrap("Mail.tm", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  // === READ ===
  if (sub === "read" || sub === "baca" || sub === "lihat") {
    const session = sessions.get(m.sender);
    if (!session) {
      return m.reply(
        claraWrap("Temp Email", `Belum punya email sementara!\nKetik: ${m.prefix}tempmail create <nama>`)
      );
    }

    if (!arg) {
      return m.reply(
        claraWrap(
          "Temp Email",
          `Cara baca:\n${m.prefix}tempmail read <nomor>\n${m.prefix}tempmail read all\n\nCek inbox: ${m.prefix}tempmail inbox`
        )
      );
    }

    await m.react("🕒");

    try {
      const messages = await providerGetInbox(session);

      if (messages.length === 0) {
        await m.react("🐣");
        return m.reply(claraWrap("Temp Email", `Tidak ada pesan untuk dibaca.`));
      }

      // Read all
      if (arg === "all" || arg === "semua") {
        let content = `Email: ${session.address}\nProvider: ${PROVIDERS[session.provider].name}\n\n`;
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const full = await providerGetMessage(session, msg.id);
          content += `━━━━━━━━━━━━━━\n`;
          content += `PESAN ${i + 1}\n`;
          content += `Dari: ${msg.from}\n`;
          content += `Subjek: ${msg.subject}\n`;
          content += `Waktu: ${timeAgo(msg.time)}\n`;
          let body = full.text || "(No content)";
          if (body.length > 800) body = body.slice(0, 800) + "\n\n... (dipotong)";
          content += `Isi:\n${body}\n\n`;
        }
        await m.react("🐣");
        return m.reply( claraWrap("Temp Email - Semua Pesan", content), "tempmail");
      }

      // Read by number
      const num = parseInt(arg);
      if (isNaN(num) || num < 1 || num > messages.length) {
        return m.reply(
          claraWrap(
            "Temp Email",
            `Nomor tidak valid!\nTersedia: 1-${messages.length}\n\nCek inbox: ${m.prefix}tempmail inbox`
          )
        );
      }

      const msg = messages[num - 1];
      const full = await providerGetMessage(session, msg.id);

      let content = `Email: ${session.address}\nProvider: ${PROVIDERS[session.provider].name}\n\n`;
      content += `Dari: ${full.from}\n`;
      content += `Nama: ${full.fromName}\n`;
      content += `Subjek: ${full.subject}\n`;
      content += `Waktu: ${new Date(full.time).toLocaleString("id-ID")}\n`;

      let body = full.text || "(No content)";
      if (body.length > 1500) body = body.slice(0, 1500) + "\n\n... (dipotong, max 1500)";
      content += `Isi:\n${body}`;

      // Extract links from HTML
      if (full.html && full.html.length > 0) {
        const links = full.html.match(/https?:\/\/[^\s"<>]+/g);
        if (links && links.length > 0) {
          const uniqueLinks = [...new Set(links)].slice(0, 5);
          content += `\n\nLink penting:\n`;
          uniqueLinks.forEach((link, i) => {
            content += `${i + 1}. ${link}\n`;
          });
        }
      }

      await m.react("🐣");
      return m.reply( claraWrap("Temp Email - Pesan", content), "tempmail");
    } catch (err) {
      if (err.response?.status === 401) {
        sessions.delete(m.sender);
        return m.reply(
          claraWrap("Temp Email", `Session expired!\nBuat baru: ${m.prefix}tempmail create <nama>`)
        );
      }
      return m.reply(claraWrap("Mail.tm", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  // === DELETE ===
  if (sub === "delete" || sub === "hapus" || sub === "del") {
    const session = sessions.get(m.sender);
    if (!session) {
      return m.reply(claraWrap("Temp Email", `Tidak ada email aktif untuk dihapus.`));
    }

    await m.react("🕒");
    await providerDelete(session);
    sessions.delete(m.sender);

    await m.react("🐣");
    return m.reply(
      claraWrap("Temp Email", `Email ${session.address} berhasil dihapus!\nSemua pesan terkait juga terhapus.`)
    );
  }

  // === STATUS ===
  if (sub === "status" || sub === "info") {
    const session = sessions.get(m.sender);
    if (!session) {
      return m.reply(
        claraWrap("Temp Email", `Tidak ada email aktif.\nBuat: ${m.prefix}tempmail create <nama>`)
      );
    }

    const age = Date.now() - session.createdAt;
    const hrs = Math.floor(age / 3600000);
    const mins = Math.floor((age % 3600000) / 60000);
    const providerName = PROVIDERS[session.provider].name;

    await m.react("🐣");
    return m.reply(
      claraWrap(
        "Temp Email Status",
        `Provider: ${providerName}\nEmail: ${session.address}\n${session.password !== "-" ? `Password: ${session.password}\n` : ""}Dibuat: ${hrs}j ${mins}m lalu\nToken: Aktif\n\nInbox: ${m.prefix}tempmail inbox\nHapus: ${m.prefix}tempmail delete`
      )
    );
  }

  // === PROVIDER LIST ===
  if (sub === "list" || sub === "provider" || sub === "providers") {
    let list = "Temp Email Providers\n\n";
    let i = 1;
    for (const [key, p] of Object.entries(PROVIDERS)) {
      const customTag = p.customName ? " (custom name)" : " (auto-generate)";
      list += `${i}. ${key} - ${p.name}${customTag}\n`;
      i++;
    }
    list += `\nDefault: mailtm\n\nCara pakai:\n${m.prefix}tempmail create <nama> <provider>\n\nContoh:\n${m.prefix}tempmail create aizat mailtm\n${m.prefix}tempmail create aizat mailporary\n${m.prefix}tempmail create - tempmailio`;

    await m.react("🐣");
    return m.reply( claraWrap("Temp Email", list), "tempmail");
  }

  // === HELP / DEFAULT ===
  const help = `Email Sementara - 6 Provider\n\nProvider:\n1. mailtm (Mail.tm) - custom name\n2. mailgw (Mail.gw) - custom name\n3. guerrilla (Guerrilla Mail) - custom name\n4. mailporary (Mailporary) - custom name\n5. tempmailio (TempMail.io) - auto-generate
6. anonymmail (AnonymMail) - custom name\n\nPerintah:\n1. ${m.prefix}tempmail create <nama> [provider]\n   Buat email custom name\n2. ${m.prefix}tempmail inbox\n   Cek kotak masuk\n3. ${m.prefix}tempmail read <nomor>\n   Baca pesan (atau "all")\n4. ${m.prefix}tempmail status\n   Info email aktif\n5. ${m.prefix}tempmail delete\n   Hapus email\n6. ${m.prefix}tempmail list\n   Lihat daftar provider\n\nContoh:\n${m.prefix}tempmail create aizat\n${m.prefix}tempmail create aizat mailporary\n${m.prefix}tempmail inbox\n${m.prefix}tempmail read 1\n\nNote: Email expired otomatis oleh server provider.`;

  return m.reply( claraWrap("Temp Email", help), "tempmail");
}

export { pluginConfig as config, handler };
