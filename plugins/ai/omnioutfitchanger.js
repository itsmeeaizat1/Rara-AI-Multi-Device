// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .omnioutfitchanger — virtual try-on baju MULTI-ITEM (topi+baju+celana+
// 🔹 sepatu sekaligus), cocok buat konten affiliate fashion (bukan NSFW).
// 🔹 Flow: reply foto ORANG → mulai session → kirim foto ITEM satu-satu
// 🔹 (max 4) → .omnioutfitchanger pakai buat proses.
// 🔹 1 item → native endpoint zelapi ai-image/omnivton (person+outfit).
// 🔹 2-4 item → tiap item di-describe via vision jadi teks, digabung 1
// 🔹 prompt, diedit sekali pakai chain nano-banana (live3d → kuroneko).
// ═════════════════════════════════════════════
import { live3d } from "../../src/scraper/seaart.js";
import { nanoBananaEdit, uploadToUguu } from "../../src/scraper/kuroneko.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { zelImageEndpoint } from "../../src/scraper/zelapi.js";
import { claraWrap, toSC } from "../../src/lib/nova-menu-style.js";
import { boxLeft } from "../../src/lib/styler.js";
import te from "../../src/lib/nova-error.js";
import {
  MAX_ITEMS,
  getSession,
  startSession,
  addItem,
  clearSession,
} from "../../src/lib/nova-outfit-session.js";

const ITEM_Q =
  "Deskripsikan pakaian/item fashion di foto ini secara singkat dan spesifik " +
  "(jenis item, warna, bahan/tekstur, model/potongan) dalam SATU kalimat bahasa Inggris, " +
  "max 20 kata. Kalau foto ini BUKAN pakaian/aksesoris fashion (topi/baju/celana/sepatu/dll), " +
  "balas cuma teks: BUKAN_ITEM";

const pluginConfig = {
  name: "omnioutfitchanger",
  alias: ["omnioutfitchanger", "outfitchanger", "cobabaju", "tryon"],
  category: "ai image",
  description: "Virtual try-on baju multi-item (topi+baju+celana+sepatu) — ganti outfit orang pakai foto asli",
  usage:
    ".omnioutfitchanger (reply foto orang) → kirim foto item satu-satu (max 4) → .omnioutfitchanger pakai",
  example: "reply foto orang → .omnioutfitchanger → kirim foto topi, kirim foto baju → .omnioutfitchanger pakai",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

// ── Seam e2e: dependency bisa di-inject biar tes gak nyamber API live ──
let depVision = visionScan;
let depLive3d = live3d;
let depNanoBananaEdit = nanoBananaEdit;
let depUploadToUguu = uploadToUguu;
let depZelImageEndpoint = zelImageEndpoint;
export function _setOmniOutfitDepsForTest({ vision, live3d: l3, nanoBanana, uguu, zelImage } = {}) {
  if (vision) depVision = vision;
  if (l3) depLive3d = l3;
  if (nanoBanana) depNanoBananaEdit = nanoBanana;
  if (uguu) depUploadToUguu = uguu;
  if (zelImage) depZelImageEndpoint = zelImage;
}

async function downloadImage(m) {
  try {
    const buf = await m.download();
    return buf && buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}

async function downloadQuoted(m) {
  try {
    if (!m.quoted || !m.quoted.isMedia) return null;
    const buf = await m.quoted.download();
    return buf && buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}

/** Deskripsi 1 foto item pakai vision. null kalau bukan item fashion / gagal. */
export function parseItemDesc(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (/BUKAN_ITEM/i.test(t)) return null;
  const clean = t.replace(/```(json|text)?/gi, "").trim().replace(/^["']|["']$/g, "").trim();
  return clean.length >= 4 ? clean.slice(0, 200) : null;
}

/** Gabung deskripsi beberapa item jadi 1 prompt edit komprehensif. */
export function buildMultiItemPrompt(descs) {
  const list = descs.map((d, i) => `${i + 1}. ${d}`).join("\n");
  return (
    `Change the outfit of the person in this photo so they are wearing the following items:\n${list}\n\n` +
    `Keep the person's face, identity, pose, and background EXACTLY the same — only change the clothing/accessories ` +
    `to match the items listed above. Photorealistic, natural lighting, seamless integration.`
  );
}

/** Rantai edit 1 gambar: live3d nano-banana → kuroneko. Throw kalau semua down. */
async function runEditChain(personBuf, editPrompt) {
  try {
    const res = await depLive3d(personBuf, editPrompt);
    if (res?.image) return res.image;
  } catch (e) {
    console.error("omnioutfitchanger live3d:", e.message);
  }
  try {
    const imgUrl = await depUploadToUguu(personBuf, "img.jpg");
    const editedUrl = await depNanoBananaEdit(imgUrl, editPrompt);
    if (editedUrl) return editedUrl;
  } catch (e) {
    console.error("omnioutfitchanger kuroneko:", e.message);
  }
  throw new Error("semua engine edit down (live3d & kuroneko)");
}

async function toBuffer(result) {
  if (Buffer.isBuffer(result)) return result;
  const axios = (await import("axios")).default;
  const res = await axios.get(result, { responseType: "arraybuffer", timeout: 60000 });
  return Buffer.from(res.data);
}

function usageMsg(prefix, cmd) {
  return claraWrap(
    "omnioutfitchanger",
    `👗 *${toSC("virtual try-on multi-item")}*\n\n` +
      `${toSC("cara cepet")}: ${toSC("reply foto orang + lampir foto pakaian + caption")} *${prefix}${cmd} pakai*\n\n` +
      `${toSC("reply foto orang")} → *${prefix}${cmd}* (${toSC("mulai session")})\n` +
      `${toSC("lalu kirim foto item satu-satu")} (${toSC("max")} ${MAX_ITEMS}: ${toSC("topi/baju/celana/sepatu")})\n` +
      `*${prefix}${cmd} pakai* — ${toSC("proses semua item jadi 1 hasil")}\n` +
      `*${prefix}${cmd} batal* — ${toSC("batalin session")}\n\n` +
      `${toSC("contoh")}: ${toSC("reply foto orang")} → ${prefix}${cmd} → ${toSC("kirim foto topi, kirim foto baju")} → ${prefix}${cmd} pakai`,
    "guide"
  );
}

async function handler(m, { sock }) {
  const cmd = (m.command || "omnioutfitchanger").toLowerCase();
  const prefix = m.prefix || ".";
  const jid = m.sender;
  const sub = (m.args?.[0] || "").toLowerCase();

  try {
    // ── .omnioutfitchanger batal ──
    if (sub === "batal" || sub === "cancel") {
      const had = !!getSession(jid);
      clearSession(jid);
      return m.reply(
        claraWrap("omnioutfitchanger", had ? `✅ ${toSC("session dibatalkan")}.` : `⚠️ ${toSC("gak ada session aktif")}.`, had ? "success" : "guide")
      );
    }

    // ── .omnioutfitchanger pakai ──
    if (sub === "pakai" || sub === "proses" || sub === "go") {
      let sess = getSession(jid);

      // ── FIX OWNER 17 Sep 2026: foto nyambung di pesan "pakai" gak pernah
      // dibaca sebagai item/orang → nyembur usage padahal foto udah dikirim.
      // Semua kombinasi di bawah sekarang LANGSUNG JALAN:
      //   (a) reply foto ORANG + caption "pakai" + LAMPIR foto PAKAIAN → one-shot
      //   (b) session aktif + caption "pakai" + LAMPIR foto pakaian → item terakhir, langsung proses
      //   (c) "pakai" + reply foto orang (belum ada session) → mulai session, minta item
      // HANYA baca foto kalau pesannya emang gambar (caption "pakai" di foto)
      // / yang di-reply emang foto — jangan sambar pesan teks polos.
      const msgIsImageNow = !!(m.isImage || m.isMedia);
      const quotedIsImageNow = !!(
        m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.isMedia)
      );
      const attachedBuf = msgIsImageNow ? await downloadImage(m) : null;  // foto bawaan pesan ini
      const quotedBuf = quotedIsImageNow ? await downloadQuoted(m) : null; // foto yang di-reply

      if (quotedBuf && attachedBuf) {
        // (a) one-shot: foto reply = ORANG, foto lampiran = ITEM
        startSession(jid, quotedBuf);
        addItem(jid, attachedBuf);
        await m.react("🧠");
      } else if (attachedBuf && sess) {
        // (b) item ekstra/terakhir yang dilampir bareng "pakai"
        addItem(jid, attachedBuf);
        await m.react("🧠");
      } else if (quotedBuf && !sess) {
        // (c) "pakai" tapi baru foto orang doang → mulai session dulu
        startSession(jid, quotedBuf);
        await m.react("✅");
        return m.reply(
          claraWrap(
            "omnioutfitchanger",
            `✅ ${toSC("foto orang disimpan")}. ${toSC("sekarang kirim foto item-nya")} (${toSC("max")} ${MAX_ITEMS}), ` +
              `${toSC("atau langsung lampir foto pakaian bareng command")} *${prefix}${cmd} pakai*.`,
            "success"
          )
        );
      }
      sess = getSession(jid);

      if (!sess || sess.items.length < 1) {
        await m.react("❌");
        if (attachedBuf && !sess) {
          // ada foto item tapi belum ada foto ORANG
          return m.reply(
            claraWrap(
              "omnioutfitchanger",
              `⚠️ ${toSC("foto pakaian kebaca, tapi belum ada foto ORANG")} — ${toSC("reply foto orang dengan")} *${prefix}${cmd}* ${toSC("dulu")}.`,
              "guide"
            )
          );
        }
        return m.reply(
          claraWrap("omnioutfitchanger", `⚠️ ${toSC("belum ada session/item")}.\n\n${usageMsg(prefix, cmd).split("\n").slice(1).join("\n")}`, "guide")
        );
      }

      await m.react("🧠");

      let outBuf;
      if (sess.items.length === 1) {
        // ── 1 item → native endpoint zelapi ai-image/omnivton (person+outfit) ──
        const personUrl = await depUploadToUguu(sess.personBuf, "person.jpg");
        const outfitUrl = await depUploadToUguu(sess.items[0], "outfit.jpg");
        await m.react("🛠️");
        const r = await depZelImageEndpoint("ai-image/omnivton", "", {
          noText: true,
          imageUrl: personUrl,
          imageParam: "person",
          imageUrl2: outfitUrl,
          imageParam2: "outfit",
        });
        if (!r.ok) {
          clearSession(jid);
          await m.react("❌");
          const map = { API_KEY: "⚠️ Key zelapi belum di-set." };
          return m.reply(claraWrap("omnioutfitchanger", map[r.error] || `⚠️ *TRY-ON GAGAL:* ${r.error}`, "error"));
        }
        if (r.buffer) outBuf = r.buffer;
        else if (r.images?.[0]) outBuf = await toBuffer(r.images[0]);
        else throw new Error("hasil kosong dari omnivton");
      } else {
        // ── 2-4 item → describe tiap item via vision → gabung 1 prompt → nano-banana ──
        const descs = [];
        for (const itemBuf of sess.items) {
          try {
            const res = await depVision({ imageBuffer: itemBuf, question: ITEM_Q, sessionKey: null });
            const text = typeof res === "string" ? res : res?.text || res?.answer || "";
            const desc = parseItemDesc(text);
            if (desc) descs.push(desc);
          } catch (e) {
            console.error("omnioutfitchanger vision:", e.message);
          }
        }
        if (!descs.length) {
          clearSession(jid);
          await m.react("❌");
          return m.reply(claraWrap("omnioutfitchanger", `⚠️ *SEMUA FOTO ITEM GAK KEDETEKSI SEBAGAI FASHION* — coba foto yang lebih jelas.`, "error"));
        }
        await m.react("🛠️");
        const prompt = buildMultiItemPrompt(descs);
        const result = await runEditChain(sess.personBuf, prompt);
        outBuf = await toBuffer(result);
      }

      clearSession(jid);
      await m.react("🐣");
      const itemCount = sess.items.length;
      return sock.sendMessage(
        m.chat,
        {
          image: outBuf,
          caption: boxLeft(
            toSC("omni outfit changer"),
            `✨ ${toSC("try-on selesai")} — ${itemCount} ${toSC(itemCount === 1 ? "item" : "item")}\n⚙️ ${toSC(itemCount === 1 ? "engine: zelapi omnivton" : "engine: nano-banana (vision multi-item)")}`
          ),
        },
        { quoted: m }
      );
    }

    // ── .omnioutfitchanger + REPLY foto orang → mulai session baru ──
    const quotedIsImage = !!(m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage" || m.quoted.isMedia));
    const msgIsImage = !!(m.isImage || m.isMedia);

    if (quotedIsImage) {
      const personBuf = await downloadQuoted(m);
      if (!personBuf) {
        await m.react("❌");
        return m.reply(claraWrap("omnioutfitchanger", "⚠️ Gagal unduh foto orang, coba lagi.", "error"));
      }
      startSession(jid, personBuf);
      await m.react("✅");
      return m.reply(
        claraWrap(
          "omnioutfitchanger",
          `✅ ${toSC("foto orang disimpan")}. ${toSC("sekarang kirim foto item satu-satu")} (${toSC("max")} ${MAX_ITEMS}: ${toSC("topi/baju/celana/sepatu")}).\n\n` +
            `${toSC("ketik")} *${prefix}${cmd} pakai* ${toSC("kalau udah selesai kirim semua foto")}, ${toSC("atau")} *${prefix}${cmd} batal*.`,
          "success"
        )
      );
    }

    if (msgIsImage) {
      // Foto dikirim langsung bareng command (tanpa reply) → tetep dianggap foto orang
      const personBuf = await downloadImage(m);
      if (!personBuf) {
        await m.react("❌");
        return m.reply(claraWrap("omnioutfitchanger", "⚠️ Gagal unduh foto, coba lagi.", "error"));
      }
      startSession(jid, personBuf);
      await m.react("✅");
      return m.reply(
        claraWrap(
          "omnioutfitchanger",
          `✅ ${toSC("foto orang disimpan")}. ${toSC("sekarang kirim foto item satu-satu")} (${toSC("max")} ${MAX_ITEMS}).\n\n` +
            `${toSC("ketik")} *${prefix}${cmd} pakai* ${toSC("kalau udah selesai")}.`,
          "success"
        )
      );
    }

    // ── Gak ada foto sama sekali → usage ──
    return m.reply(usageMsg(prefix, cmd));
  } catch (err) {
    clearSession(jid);
    console.error("[omnioutfitchanger]", err?.message || err);
    await m.react("❌");
    return m.reply(claraWrap("omnioutfitchanger", te(prefix, cmd, m.pushName, err), "error"));
  }
}

/**
 * Hook dipanggil dari handler.js buat pesan foto POLOS (bukan command,
 * bukan reply ke apapun) — kalau sender punya session omnioutfitchanger
 * aktif, foto itu ditangkep jadi item outfit. Return true kalau
 * ke-handle (caller WAJIB return / stop pipeline), false kalau bukan
 * urusan fitur ini (lanjut proses normal).
 */
export async function handleOutfitPhotoHook(m) {
  try {
    const jid = m.sender;
    const sess = getSession(jid);
    if (!sess) return false;
    // FIX 17 Sep 2026: foto item yang dikirim sambil REPLY ke pesan TEKS
    // (misal konfirmasi bot) juga harus ke-tangkep — dulu cuma foto polos.
    // Yang dikecualikan cuma reply ke pesan GAMBAR (itu jalur foto orang).
    const quotedIsImageMsg = !!(m.quoted && (m.quoted.isImage || m.quoted.type === "imageMessage"));
    const isPlainImage = !!(m.isImage || m.isMedia) && !quotedIsImageMsg;
    if (!isPlainImage) return false;

    const buf = await downloadImage(m);
    if (!buf) return false;

    const res = addItem(jid, buf);
    if (!res) return false;

    const count = res.sess.items.length;
    await m.react("✅");
    if (res.full) {
      await m.reply(
        claraWrap(
          "omnioutfitchanger",
          `📸 ${toSC("item ke")}-${count}/${MAX_ITEMS} ${toSC("disimpan")} — ${toSC("udah maksimal")}!\n${toSC("ketik")} *${m.prefix || "."}omnioutfitchanger pakai* ${toSC("buat proses")}.`,
          "success"
        )
      );
    } else {
      await m.reply(
        claraWrap(
          "omnioutfitchanger",
          `📸 ${toSC("item ke")}-${count}/${MAX_ITEMS} ${toSC("disimpan")}. ${toSC("kirim lagi atau ketik")} *${m.prefix || "."}omnioutfitchanger pakai*.`,
          "success"
        )
      );
    }
    return true;
  } catch (e) {
    console.error("[handleOutfitPhotoHook]", e?.message || e);
    return false;
  }
}

export { pluginConfig as config, handler };
