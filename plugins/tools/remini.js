// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Remini — AI Photo Enhancer ala app Remini asli
// ENGINE UTAMA: BeautyPlus img-enhancer (Pixocial) — FACE RESTORE AI ala Remini
//   .remini            → face restore (default) — restore wajah, bukan sekadar upscale
//   .remini hd         → enhance HD umum (img_hd)
//   .remini 16k/product/text/concert → mode khusus BeautyPlus
// ENGINE LOKAL (opsi/fallback): Swin2SR/Real-ESRGAN via ONNX — 100% lokal, TANPA WATERMARK
//   .remini real/upscale → 4x upscale murni tanpa face-restore (tanpa watermark)
//   .remini 1080/2k/4k/5k → pilih ukuran hasil (engine lokal)
// Catatan engine: endpoint vyro.ai & flow web app.remini.ai (guest) sudah mati —
// BeautyPlus img-enhancer ini satu-satunya face-restore AI gratis yang masih hidup
// (terverifikasi live 2026-09-06: img_portrait 11.9s hasil 836KB)
import crypto from "crypto";
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
// Worker thread pool: inference Swin2SR jalan di thread terpisah — bot tetap
// responsif selama render (dulu ngeblok event loop total, command lain mati)
import { enhanceLocalAsync, hdQueueInfo, isModelCached } from "../../src/lib/nova-hd-pool.js";

const pluginConfig = {
  name: "remini",
  alias: ["remini", "enhance"],
  category: "tools",
  description: "AI Photo Enhancer ala Remini (unblur, face enhance, upscale AI)",
  usage: ".remini (reply gambar) — Face Restore ala Remini (default)\n.remini face — restore wajah (sama kayak default)\n.remini hd — enhance HD umum\n.remini 16k / product / text / concert — mode khusus\n.remini real / upscale — upscale 4x murni, local AI tanpa watermark\n.remini 1080 / 2k / 4k / 5k — pilih ukuran hasil (local AI, di atas 1080 khusus Owner)\n.remini doc — kirim hasil sebagai dokumen",
  example: ".remini\n.remini face\n.remini doc",
  cooldown: 20,
  energi: 2,
  isEnabled: true,
};

// ═══ ENGINE: BeautyPlus img-enhancer (guest flow) ═══

const BP_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";
const BP_ORIGIN = "https://www.beautyplus.com";
const BP_REFERER = `${BP_ORIGIN}/id/image-enhancer`;
const BP_SIGN_KEY = "bp_img_enhancer_guest_v1_79fa8a0dc0a40e711ba63562b74f12e8";

const bpApi = axios.create({
  timeout: 120000,
  validateStatus: () => true,
  headers: { "user-agent": BP_UA },
});

// Mode enhance → algoritma engine
const MODES = {
  hd: { algo: "img_hd", label: "Enhance HD" },
  face: { algo: "img_portrait", label: "Face Restore" },
  portrait: { algo: "img_portrait", label: "Face Restore" },
  "16k": { algo: "img_16k", label: "Ultra 16K" },
  product: { algo: "img_product", label: "Product Shot" },
  text: { algo: "img_text", label: "Text Enhance" },
  concert: { algo: "img_concert", label: "Concert Shot" },
};

function randomUid() {
  return `bplus-${crypto.randomBytes(16).toString("hex")}`;
}

function guessMime(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return { suffix: "jpg", mime: "image/jpeg" };
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return { suffix: "png", mime: "image/png" };
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return { suffix: "webp", mime: "image/webp" };
  return { suffix: "jpg", mime: "image/jpeg" };
}

function bpHeaders(uid) {
  return {
    accept: "application/json, text/plain, */*",
    "x-tenant": "bplus",
    "x-locale": "id",
    "x-anonymous-uid": uid,
    origin: BP_ORIGIN,
    referer: BP_REFERER,
    "user-agent": BP_UA,
  };
}

async function getPolicy(suffix) {
  const url = `https://strategy.pixocial.com/upload/policy?app=BeautyPlusWeb&suffix=${suffix}&type=tmp-photo`;
  const res = await bpApi.get(url, {
    headers: { accept: "*/*", origin: BP_ORIGIN, referer: `${BP_ORIGIN}/`, "user-agent": BP_UA },
  });
  if (res.status !== 200 || !Array.isArray(res.data) || !res.data[0]?.oss) {
    throw new Error("policy_failed");
  }
  return res.data[0].oss;
}

async function uploadFile(buffer, suffix, mime, oss) {
  const creds = oss.credentials;
  const now = new Date();
  const xAmzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = xAmzDate.slice(0, 8);
  const credential = `${creds.access_key}/${date}/${oss.region}/s3/aws4_request`;

  const policyObj = {
    expiration: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    conditions: [
      { bucket: oss.bucket },
      ["starts-with", "$key", "tmp-photo/"],
      ["starts-with", "$Content-Type", "image/"],
      { success_action_status: "200" },
      { "x-amz-credential": credential },
      { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
      { "x-amz-security-token": creds.session_token },
      { "x-amz-date": xAmzDate },
    ],
  };
  const policy = Buffer.from(JSON.stringify(policyObj)).toString("base64");

  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${creds.secret_key}`, date), oss.region), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(policy).digest("hex");

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("key", oss.key);
  form.append("Content-Type", mime);
  form.append("success_action_status", "200");
  form.append("X-Amz-Credential", credential);
  form.append("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  form.append("X-Amz-Security-Token", creds.session_token);
  form.append("X-Amz-Date", xAmzDate);
  form.append("Policy", policy);
  form.append("X-Amz-Signature", signature);
  form.append("file", buffer, { filename: `image.${suffix}`, contentType: mime });

  const res = await bpApi.post(`https://${oss.bucket}.oss-ap-southeast-1.aliyuncs.com/`, form, {
    headers: { ...form.getHeaders(), origin: BP_ORIGIN, referer: `${BP_ORIGIN}/` },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  if (res.status !== 200) throw new Error("upload_failed");
  return oss.data;
}

async function checkQuota(uid, algorithm) {
  const res = await bpApi.get(`${BP_ORIGIN}/core-api/v1/img-enhancer/quota/info?algorithm=${algorithm}`, {
    headers: bpHeaders(uid),
  });
  if (res.status !== 200) throw new Error("quota_failed");
  if (res.data?.needUpgrade || !(res.data?.freeAvailable > 0 || res.data?.creditsAvailable > 0)) {
    throw new Error("quota_limited");
  }
}

async function createTask(sourceUrl, algorithm, uid) {
  const ts = String(Math.floor(Date.now() / 1e3));
  // payload signature — PENTING: lastTaskId string kosong, dan jangan kirim key null di body
  const payload = ["img-enhancer-task", "v2", ts, sourceUrl, algorithm, ""].join("\n");
  const xSign = crypto.createHmac("sha256", BP_SIGN_KEY).update(payload).digest("hex");

  const res = await bpApi.post(
    `${BP_ORIGIN}/core-api/v2/img-enhancer/task`,
    { sourceUrl, algorithm },
    {
      headers: {
        ...bpHeaders(uid),
        "content-type": "application/json",
        "x-timestamp": ts,
        "x-sign": xSign,
      },
    }
  );
  if (res.status !== 201 || typeof res.data !== "string") {
    throw new Error(res.data?.message || "task_failed");
  }
  return res.data;
}

function getResult(taskId, uid) {
  return new Promise(async (resolve, reject) => {
    const res = await bpApi.get(`${BP_ORIGIN}/core-api/v2/img-enhancer/query-sse/${taskId}`, {
      responseType: "stream",
      timeout: 180000,
      headers: { ...bpHeaders(uid), accept: "text/event-stream" },
    });
    if (res.status !== 200) return reject(new Error("sse_failed"));

    let raw = "";
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        try { res.data.destroy(); } catch {}
        reject(new Error("timeout"));
      }
    }, 180000);

    res.data.on("data", (chunk) => {
      raw += chunk.toString();
      for (const match of raw.matchAll(/^data:\s*(.+)$/gm)) {
        try {
          const data = JSON.parse(match[1]);
          if (data.status === "success" && data.effectUrl) {
            done = true;
            clearTimeout(timer);
            try { res.data.destroy(); } catch {}
            resolve(data.effectUrl);
          } else if (data.status === "failed" || data.status === "error" || data.status === "fail") {
            done = true;
            clearTimeout(timer);
            try { res.data.destroy(); } catch {}
            reject(new Error("process_failed"));
          }
        } catch {}
      }
    });
    res.data.on("end", () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        reject(new Error("empty_result"));
      }
    });
    res.data.on("error", (err) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

// ═══ Full pipeline ═══

async function reminiEnhance(buffer, mode) {
  const { algo, label } = MODES[mode] || MODES.hd;
  const uid = randomUid();
  const { suffix, mime } = guessMime(buffer);

  const policy = await getPolicy(suffix);
  const sourceUrl = await uploadFile(buffer, suffix, mime, policy);
  await checkQuota(uid, algo);
  const taskId = await createTask(sourceUrl, algo, uid);
  const resultUrl = await getResult(taskId, uid);

  const dl = await bpApi.get(resultUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: 30 * 1024 * 1024,
  });
  if (dl.status !== 200 || !dl.data) throw new Error("download_failed");

  return { buffer: Buffer.from(dl.data), label, algo };
}

// ═══ Handler ═══

async function handler(m, { sock, args }) {
  const img = m.isImage || (m.quoted && (m.quoted.type === "imageMessage" || m.quoted.isImage));

  if (!img) {
    return m.reply(claraWrap("remini", "Reply atau kirim gambar dengan caption .remini untuk face restore ala Remini. Mode: face (default), hd, 16k, product, text, concert, real (upscale murni).", "guide"), "remini");
  }

  try {
    await m.react("🕒");

    const argList = (args || []).map((a) => String(a).toLowerCase());
    const wantDoc = argList.includes("doc");

    // ═══ PILIH ENGINE ═══
    // DEFAULT = BeautyPlus face restore (request owner 2026-09-06: hasil local AI
    // "cm main upscale" — face-restore AI beneran cuma ada di BeautyPlus img_portrait).
    // Local AI (Swin2SR) tetep kepake buat: mode real/upscale eksplisit, pilihan
    // ukuran 1080p-5K, dan fallback kalau BeautyPlus down/kuotanya abis.
    const SIZES = { "1080": 1920, fhd: 1920, fullhd: 1920, "2k": 2560, qhd: 2560, "4k": 3840, uhd: 3840, "5k": 5120 };
    const sizeArg = argList.find((a) => SIZES[a]);
    // "real"/"ultra"/"4x" = upscale 4x murni; "local"/"upscale" = paksa engine lokal
    const wantLocal =
      argList.some((a) => ["real", "ultra", "local", "upscale", "4x"].includes(a)) || !!sizeArg;
    const localMode = argList.some((a) => ["real", "ultra", "4x"].includes(a)) ? "real" : "hd";
    // mode BeautyPlus: ambil dari args (hd/face/16k/product/text/concert), default face
    // alias lama ".remini bp <mode>" tetep jalan — 'bp' cuma diabaikan di sini
    const bpMode = wantLocal ? null : argList.find((a) => MODES[a]) || "face";
    const targetOut = sizeArg ? SIZES[sizeArg] : 1920;

    // Ukuran di atas 1080p = OWNER ONLY (proses berat, bisa 3-5 menit per gambar)
    if (targetOut > 1920 && !m.isOwner) {
      await m.react("🚫");
      return m.reply(
        claraWrap("remini", "Ukuran di atas 1080p hanya untuk Owner. User biasa bisa pakai .remini biasa (face restore) atau .remini real.", "error"),
        "remini"
      );
    }

    let mediaBuffer;
    if (m.quoted?.isMedia || m.quoted?.type === "imageMessage") {
      mediaBuffer = await m.quoted.download();
    } else if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      await m.react("❌");
      return m.reply(claraWrap("remini", "Gagal mengunduh gambar. Coba reply gambarnya lagi.", "error"), "remini");
    }

    if (mediaBuffer.length > 15 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(claraWrap("remini", "Ukuran gambar maksimal 15MB untuk fitur ini.", "error"), "remini");
    }

    let resultBuffer;
    let label;
    let outWidth = 0;
    let outHeight = 0;
    let engineNote = "Engine: BeautyPlus AI (Face Restore)";

    // Engine lokal (Swin2SR) — dipakai beramai-ramai: mode real, pilihan ukuran,
    // dan fallback BeautyPlus. Antrian + notice unduh model + react per tahap.
    const runLocal = async () => {
      const q = hdQueueInfo();
      if (q.busy) {
        try { await m.react("⏳"); } catch {}
        m.reply(claraWrap("remini", `Render sedang diproses${q.ahead > 0 ? `, ${q.ahead} antrian lain` : ""} — kamu antrian ke-${q.ahead + 1}. Mohon tunggu, hasil otomatis dikirim setelah selesai.`));
      }
      if (!isModelCached(localMode)) {
        try { await m.react("🧠"); } catch {}
        m.reply(claraWrap("remini", "Model AI lokal belum ada di server — sedang diunduh otomatis (±59MB, cukup sekali saja). Proses pertama lebih lama dari biasanya, mohon tunggu ya."));
      }
      const opts = targetOut
        ? { maxSide: Math.max(128, Math.round(targetOut / (localMode === "real" ? 4 : 2))), enlarge: true }
        : {};
      try { await m.react("🎨"); } catch {}
      return enhanceLocalAsync(mediaBuffer, localMode, opts);
    };

    if (bpMode) {
      // ═══ BeautyPlus AI — engine utama (face restore ala Remini) ═══
      try {
        const r = await reminiEnhance(mediaBuffer, bpMode);
        resultBuffer = r.buffer;
        label = r.label;
        engineNote = "Engine: BeautyPlus AI";
      } catch (e1) {
        console.error("[REMINI] BeautyPlus gagal:", e1.message);
        // img_portrait butuh wajah di foto — kalau proses gagal (bukan kuota),
        // coba sekali lagi pakai img_hd (enhance umum) sebelum fallback lokal
        if (e1.message === "process_failed" && MODES[bpMode]?.algo === "img_portrait") {
          try {
            const r = await reminiEnhance(mediaBuffer, "hd");
            resultBuffer = r.buffer;
            label = r.label;
            engineNote = "Engine: BeautyPlus AI (Enhance HD)";
          } catch (e2) {
            console.error("[REMINI] BeautyPlus retry hd gagal:", e2.message);
          }
        }
        if (!resultBuffer) {
          // fallback terakhir: local AI tanpa watermark
          try {
            const r = await runLocal();
            resultBuffer = r.buffer;
            label = `${r.label} - ${r.width}x${r.height} (${(r.ms / 1000).toFixed(0)}s)`;
            outWidth = r.width;
            outHeight = r.height;
            engineNote = "Engine: Local AI (fallback — tanpa watermark)";
          } catch (e3) {
            throw e1.message === "quota_limited" ? e1 : e3;
          }
        }
      }
    } else {
      // ═══ Local AI (Swin2SR) — mode real/upscale & pilihan ukuran ═══
      const r = await runLocal();
      resultBuffer = r.buffer;
      label = `${r.label} - ${r.width}x${r.height} (${(r.ms / 1000).toFixed(0)}s)`;
      outWidth = r.width;
      outHeight = r.height;
      engineNote = "Engine: Local AI (tanpa watermark)";
    }
    const sizeMB = (resultBuffer.length / (1024 * 1024)).toFixed(2);

    await m.react("🐣");

    // Hasil di atas 1080p → otomatis document (WA bakal nge-compress kalo dikirim
    // sebagai image — document jaga kualitas hasil HD/2K/4K/5K)
    const autoDoc = outWidth > 1920 || outHeight > 1920;

    const caption = `*Remini AI Enhanced*\nMode: ${label}\n${engineNote}\nQuality: ${sizeMB}MB`;
    if (wantDoc || autoDoc || resultBuffer.length > 5 * 1024 * 1024) {
      return await sock.sendMessage(
        m.chat,
        { document: resultBuffer, mimetype: "image/jpeg", fileName: `Remini-${label.replace(/\s+/g, "")}-${Date.now()}.jpg`, caption },
        { quoted: m }
      );
    }
    return await sock.sendMessage(m.chat, { image: resultBuffer, caption, jpegQuality: 100 }, { quoted: m });
  } catch (e) {
    console.error("[REMINI]", e.message);
    await m.react("❌");
    const msg =
      e.message === "quota_limited"
        ? "Kuota enhance sementara habis, coba lagi beberapa menit."
        : e.message === "timeout_render"
          ? "Render AI lokal kelamaan / macet — kemungkinan unduhan model pertama kena internet server. Coba lagi sebentar, atau pakai .remini biasa (face restore)."
          : e.message === "process_failed"
            ? "AI gagal memproses gambar. Coba gambar lain atau mode .remini face."
            : te(m.prefix, m.command, m.pushName);
    return m.reply(claraWrap("remini", msg, "error"), "remini");
  }
}

export { pluginConfig as config, handler };
