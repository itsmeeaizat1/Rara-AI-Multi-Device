// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Remini — AI Photo Enhancer ala app Remini asli
// ENGINE UTAMA: CodeFormer (HuggingFace Space sczhou/CodeFormer) — FACE RESTORE
// tanpa watermark (face-restoration model asli, ±3-10 detik).
//   .remini / .remini face / .remini hd → face restore + bg enhance (default)
// FALLBACK: Local AI Swin2SR-realworld 4x (Real-ESRGAN style) — 100% lokal,
// TANPA WATERMARK — otomatis dipakai kalau CodeFormer error/kuota habis.
//   .remini real/upscale → 4x restore langsung (local AI)
//   .remini 1080/2k/4k/5k → pilih ukuran hasil (engine lokal)
// BeautyPlus = HANYA mode eksplisit (16k/product/text/concert atau .remini bp <mode>)
// — hasil bisa ada watermark, JANGAN dipakai sebagai default (request owner 2026-09-06).
// Opsional: set env HF_TOKEN (akun huggingface.co gratis) di VPS biar kuota ZeroGPU
// CodeFormer jauh lebih gede — tanpa token kuota anonymous tipis (fallback lokal aman).
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
  usage: ".remini (reply gambar) — Face Restore ala Remini, tanpa watermark (default)\n.remini face — restore wajah (sama kayak default)\n.remini hd — face restore + enhance HD\n.remini real / upscale — restore 4x local AI tanpa watermark\n.remini 1080 / 2k / 4k / 5k — pilih ukuran hasil (local AI, di atas 1080 khusus Owner)\n.remini bp hd/face/16k/product/text/concert — engine BeautyPlus (bisa ada watermark)\n.remini doc — kirim hasil sebagai dokumen",
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

// ═══ ENGINE: CodeFormer (HuggingFace Space sczhou/CodeFormer) ═══
// Face restoration model asli — TANPA WATERMARK. Lewat gradio API (upload → call → SSE).
// Anonymous: kuota ZeroGPU tipis → otomatis fallback ke local AI di handler.
// Set env HF_TOKEN (huggingface.co gratis) buat kuota jauh lebih gede.

const CF_SPACE = "https://sczhou-codeformer.hf.space";
const CF_TIMEOUT = 90000;

function cfHeaders() {
  const h = { accept: "*/*" };
  const tok = process.env.HF_TOKEN || process.env.HFTOKEN || "";
  if (tok) h["Authorization"] = "Bearer " + tok;
  return h;
}

async function codeformerEnhance(buffer, { fidelity = 0.5, upscale = 2 } = {}) {
  const { suffix, mime } = guessMime(buffer);

  // 1. upload ke space
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("files", buffer, { filename: "image." + suffix, contentType: mime });
  const up = await axios.post(CF_SPACE + "/gradio_api/upload", form, {
    headers: { ...form.getHeaders(), ...cfHeaders() },
    timeout: 60000,
    maxBodyLength: Infinity,
  });
  const cfPath = up.data?.[0];
  if (!cfPath) throw new Error("upload_failed");

  // 2. submit inference (face_align + bg_enhance + face_upsample ON, upscale 2x)
  const call = await axios.post(
    CF_SPACE + "/gradio_api/call/inference",
    { data: [{ path: cfPath }, true, true, true, upscale, fidelity] },
    { headers: { ...cfHeaders(), "content-type": "application/json" }, timeout: 30000 }
  );
  const eventId = call.data?.event_id;
  if (!eventId) throw new Error("task_failed");

  // 3. poll SSE sampai complete / error (kuota, proses gagal, timeout)
  const resultUrl = await new Promise((resolve, reject) => {
    let raw = "";
    let done = false;
    axios
      .get(CF_SPACE + "/gradio_api/call/inference/" + eventId, {
        responseType: "stream",
        timeout: CF_TIMEOUT,
        headers: cfHeaders(),
      })
      .then((res) => {
        const timer = setTimeout(() => {
          if (!done) { done = true; try { res.data.destroy(); } catch {} reject(new Error("timeout")); }
        }, CF_TIMEOUT);
        const finish = (fn, arg) => { if (!done) { done = true; clearTimeout(timer); try { res.data.destroy(); } catch {} fn(arg); } };
        res.data.on("data", (chunk) => {
          raw += chunk.toString();
          for (const m of raw.matchAll(/^data:\s*(.+)$/gm)) {
            const line = m[1];
            if (line === "null") return finish(reject, new Error("process_failed"));
            let data;
            try { data = JSON.parse(line); } catch { continue; }
            if (Array.isArray(data) && data[0]?.url) return finish(resolve, data[0].url);
            if (typeof data === "string" && /quota|exceeded/i.test(data)) return finish(reject, new Error("quota_limited"));
            if (data && typeof data === "object" && data.error) return finish(reject, new Error("process_failed"));
          }
        });
        res.data.on("end", () => finish(reject, new Error("empty_result")));
        res.data.on("error", (e) => finish(reject, e));
      })
      .catch(reject);
  });

  // 4. download hasil (PNG) → convert JPEG biar ringan buat WA
  const dl = await axios.get(resultUrl, { responseType: "arraybuffer", timeout: 60000, maxContentLength: 30 * 1024 * 1024 });
  if (dl.status !== 200 || !dl.data) throw new Error("download_failed");
  let out = Buffer.from(dl.data);
  try {
    const sharp = (await import("sharp")).default;
    out = await sharp(out).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  } catch { /* kirim PNG apa adanya kalau sharp gagal */ }
  return { buffer: out, label: "Face Restore" };
}

// ═══ Handler ═══

async function handler(m, { sock, args }) {
  const img = m.isImage || (m.quoted && (m.quoted.type === "imageMessage" || m.quoted.isImage));

  if (!img) {
    return m.reply(claraWrap("remini", "Reply atau kirim gambar dengan caption .remini untuk face restore ala Remini (tanpa watermark). Mode: face (default), hd, real (restore 4x local), atau bp hd/16k/product/text/concert (BeautyPlus, bisa ada watermark).", "guide"), "remini");
  }

  try {
    await m.react("🕒");

    const argList = (args || []).map((a) => String(a).toLowerCase());
    const wantDoc = argList.includes("doc");

    // ═══ PILIH ENGINE ═══
    // DEFAULT = CodeFormer (HuggingFace) — face restore TANPA WATERMARK (request owner
    // 2026-09-06: BeautyPlus ada watermark, jangan jadi default).
    // Fallback CodeFormer = local AI real (4x restore, tanpa watermark).
    // Local AI langsung dipakai buat mode real/upscale & pilihan ukuran 1080p-5K.
    // BeautyPlus HANYA eksplisit: .remini bp <mode> atau mode 16k/product/text/concert.
    const SIZES = { "1080": 1920, fhd: 1920, fullhd: 1920, "2k": 2560, qhd: 2560, "4k": 3840, uhd: 3840, "5k": 5120 };
    const sizeArg = argList.find((a) => SIZES[a]);
    const wantLocal =
      argList.some((a) => ["real", "ultra", "local", "upscale", "4x"].includes(a)) || !!sizeArg;
    const localMode = argList.some((a) => ["real", "ultra", "4x"].includes(a)) ? "real" : "hd";
    const wantBp =
      !wantLocal && (argList.includes("bp") || argList.some((a) => ["16k", "product", "text", "concert"].includes(a)));
    const bpMode = wantBp ? argList.find((a) => MODES[a]) || "hd" : null;
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

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length < 100) {
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
    let engineNote = "Engine: CodeFormer AI (tanpa watermark)";

    // Engine lokal (Swin2SR) — dipakai untuk mode real, pilihan ukuran, dan
    // fallback CodeFormer/BeautyPlus. Antrian + notice unduh model + react per tahap.
    const runLocal = async (mode = localMode) => {
      const q = hdQueueInfo();
      if (q.busy) {
        try { await m.react("⏳"); } catch {}
        m.reply(claraWrap("remini", `Render sedang diproses${q.ahead > 0 ? `, ${q.ahead} antrian lain` : ""} — kamu antrian ke-${q.ahead + 1}. Mohon tunggu, hasil otomatis dikirim setelah selesai.`));
      }
      if (!isModelCached(mode)) {
        try { await m.react("🧠"); } catch {}
        m.reply(claraWrap("remini", "Model AI lokal belum ada di server — sedang diunduh otomatis (±59MB, cukup sekali saja). Proses pertama lebih lama dari biasanya, mohon tunggu ya."));
      }
      const opts = targetOut
        ? { maxSide: Math.max(128, Math.round(targetOut / (mode === "real" ? 4 : 2))), enlarge: true }
        : {};
      try { await m.react("🎨"); } catch {}
      return enhanceLocalAsync(mediaBuffer, mode, opts);
    };

    if (wantBp) {
      // ═══ BeautyPlus — HANYA mode eksplisit (bisa ada watermark) ═══
      try {
        const r = await reminiEnhance(mediaBuffer, bpMode);
        resultBuffer = r.buffer;
        label = r.label;
        engineNote = "Engine: BeautyPlus AI (bisa ada watermark)";
      } catch (e1) {
        console.error("[REMINI] BeautyPlus gagal:", e1.message);
        // fallback: local AI tanpa watermark
        try {
          const r = await runLocal("real");
          resultBuffer = r.buffer;
          label = `${r.label} - ${r.width}x${r.height} (${(r.ms / 1000).toFixed(0)}s)`;
          outWidth = r.width;
          outHeight = r.height;
          engineNote = "Engine: Local AI 4x Restore (fallback — tanpa watermark)";
        } catch (e3) {
          throw e1.message === "quota_limited" ? e1 : e3;
        }
      }
    } else if (!wantLocal) {
      // ═══ CodeFormer (HuggingFace) — DEFAULT, face restore tanpa watermark ═══
      try {
        try { await m.react("🎨"); } catch {}
        const r = await codeformerEnhance(mediaBuffer, { fidelity: 0.5, upscale: 2 });
        resultBuffer = r.buffer;
        label = r.label;
        engineNote = "Engine: CodeFormer AI (tanpa watermark)";
      } catch (e1) {
        console.error("[REMINI] CodeFormer gagal:", e1.message);
        if (e1.message === "quota_limited") {
          try { await m.react("⏳"); } catch {}
        }
        // fallback: local Real-ESRGAN style 4x — tanpa watermark (request owner)
        const r = await runLocal("real");
        resultBuffer = r.buffer;
        label = `${r.label} - ${r.width}x${r.height} (${(r.ms / 1000).toFixed(0)}s)`;
        outWidth = r.width;
        outHeight = r.height;
        engineNote = "Engine: Local AI 4x Restore (fallback — tanpa watermark)";
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
          ? "Render AI lokal kelamaan / macet — kemungkinan unduhan model pertama kena internet server. Coba lagi sebentar ya."
          : e.message === "process_failed"
            ? "AI gagal memproses gambar. Coba gambar lain, atau mode .remini real."
            : te(m.prefix, m.command, m.pushName);
    return m.reply(claraWrap("remini", msg, "error"), "remini");
  }
}

export { pluginConfig as config, handler };
