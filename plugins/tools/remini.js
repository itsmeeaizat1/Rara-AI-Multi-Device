// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Remini — AI Photo Enhancer ala app Remini asli
// ENGINE UTAMA: REMINI MOBILE API ASLI (unofficial, reverse-engineered dari Android
// client com.bigwinepot.nwdn build 3.7.1390 — oracle/setup identity token → GCS
// upload → task → process → poll → download). Face restore asli app Remini,
// TANPA WATERMARK, hasil s/d ±3480px. Terverifikasi live 2026-09-06:
// 400x500 → 2783x3480 dalam 3 detik (ref: SSL-ACTX/remini-unofficial-api).
//   .remini / .remini face / .remini hd → face_enhance model "remini" (default)
// FALLBACK: Local AI Swin2SR-realworld 4x (Real-ESRGAN style) — 100% lokal,
// TANPA WATERMARK — otomatis dipakai kalau Remini mobile error/kuota habis.
//   .remini real/upscale → 4x restore langsung (local AI)
//   .remini 1080/2k/4k/5k → pilih ukuran hasil (engine lokal)
// BeautyPlus = HANYA mode eksplisit (16k/product/text/concert atau .remini bp <mode>)
// — hasil bisa ada watermark, JANGAN dipakai sebagai default (request owner 2026-09-06).
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
  usage: ".remini (reply gambar) — Face Restore ala Remini asli, tanpa watermark\n.remini face — restore wajah (sama kayak default)\n.remini hd — face restore + enhance HD\n.remini real / upscale — restore 4x local AI tanpa watermark\n.remini 1080 / 2k / 4k / 5k — pilih ukuran hasil (local AI, di atas 1080 khusus Owner)\n.remini bp hd/face/16k/product/text/concert — engine BeautyPlus (bisa ada watermark)\n.remini doc — kirim hasil sebagai dokumen",
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

// ═══ ENGINE: Remini Mobile API (unofficial — Android client protocol) ═══
// Face restore asli app Remini, TANPA WATERMARK. Port dari SSL-ACTX/remini-unofficial-api.
// Flow: oracle/setup (identity token) → POST /tasks → PUT GCS → POST /process → poll → download.
// Token + device identity di-persist ke src/data/remini-mobile-token.json — kalau balance
// habis / 401-403, otomatis regen device baru + token baru (credit identity baru).

const RM_ORACLE = "https://api.remini.ai/v1/mobile/oracle/setup";
const RM_TASKS = "https://a.android.api.remini.ai/v1/mobile/tasks";
const RM_USERS_ME = "https://a.android.api.remini.ai/v1/mobile/users/@me";
const RM_TOKEN_FILE = path.join(path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))), "src", "data", "remini-mobile-token.json");
const RM_POLL_INTERVAL = 3000;
const RM_POLL_MAX = 40; // ±2 menit

const RM_DEVICES = [
  { manufacturer: "INFINIX", model: "Infinix X669", type: "6.6", os: "31" },
  { manufacturer: "Samsung", model: "SM-G998B", type: "6.8", os: "33" },
  { manufacturer: "Xiaomi", model: "2201116SG", type: "6.67", os: "32" },
  { manufacturer: "Google", model: "Pixel 7 Pro", type: "6.7", os: "33" },
  { manufacturer: "OPPO", model: "CPH2211", type: "6.5", os: "31" },
];

function rmRandomDevice() {
  const hex = (n) => crypto.randomBytes(n).toString("hex");
  const uuid = () => crypto.randomUUID();
  const androidId = hex(8).slice(0, 16);
  return {
    android_id: androidId,
    aaid: uuid(),
    backup_persistent_id: `${androidId}_com.bigwinepot.nwdn.international`,
    non_backup_persistent_id: uuid(),
    spec: RM_DEVICES[Math.floor(Math.random() * RM_DEVICES.length)],
  };
}

function rmLoadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(RM_TOKEN_FILE, "utf-8"));
    if (raw?.identity_token) return raw;
  } catch {}
  return null;
}

function rmSaveState(state) {
  try {
    fs.mkdirSync(path.dirname(RM_TOKEN_FILE), { recursive: true });
    fs.writeFileSync(RM_TOKEN_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

function rmBaseHeaders(state) {
  return {
    "Bsp-Id": "com.bigwinepot.nwdn.international.android",
    "Build-Number": "202523423",
    "Build-Version": "3.7.1390",
    Country: "US",
    "Device-Manufacturer": state.device.spec.manufacturer,
    "Device-Model": state.device.spec.model,
    "Device-Type": state.device.spec.type,
    Language: "en",
    Locale: "en_US",
    "OS-Version": state.device.spec.os,
    Platform: "Android",
    Timezone: "Asia/Manila",
    "Android-id": state.device.android_id,
    aaid: state.device.aaid,
    "accept-encoding": "gzip",
    "User-Agent": "okhttp/4.12.0",
  };
}

function rmHeaders(state, contentType) {
  const h = { ...rmBaseHeaders(state) };
  if (state.identity_token) {
    h["Identity-Token"] = state.identity_token;
    h["Iris-Access-Token"] = state.identity_token;
    h["Iris-Nonces-Counter"] = "3";
  }
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

const rmApi = axios.create({ timeout: 60000, validateStatus: () => true, maxBodyLength: Infinity, maxContentLength: Infinity });

async function rmVerify(state) {
  if (!state.identity_token) return false;
  const res = await rmApi.get(RM_USERS_ME, { headers: rmHeaders(state) });
  if (res.status !== 200) return false;
  const balance = res.data?.balance ?? 0;
  return balance > 0;
}

// Ambil identity token baru via oracle/setup (device fresh tiap regen —
// credit balance identity baru otomatis dapat jatah lagi)
async function rmFetchToken(state) {
  const ts = String(Math.round(Date.now() / 1000));
  const headers = {
    ...rmHeaders(state),
    "First-Install-Timestamp": ts + "E9",
    "Backup-Persistent-Id": state.device.backup_persistent_id,
    "Non-Backup-Persistent-Id": state.device.non_backup_persistent_id,
    Environment: "Production",
    "settings-response-version": "v2",
    "Is-App-Running-In-Background": "false",
    "Is-Old-User": "true",
  };
  const res = await rmApi.get(RM_ORACLE, { headers });
  if (res.status !== 200) throw new Error("setup_failed");
  const token = res.data?.settings?.__identity__?.token;
  if (!token) throw new Error("no_token");
  state.identity_token = token;
  rmSaveState(state);
  return state;
}

async function rmEnsureAuth() {
  let state = rmLoadState();
  if (state?.identity_token && state?.device?.spec) {
    try {
      if (await rmVerify(state)) return state;
    } catch {}
  }
  // token invalid / balance habis → regen device baru + token baru
  state = { device: rmRandomDevice(), identity_token: null };
  await rmFetchToken(state);
  if (!(await rmVerify(state).catch(() => false))) {
    state = { device: rmRandomDevice(), identity_token: null };
    await rmFetchToken(state);
    if (!(await rmVerify(state).catch(() => false))) throw new Error("auth_failed");
  }
  return state;
}

const RM_DEFAULT_PIPELINE = {
  face_enhance: { model: "remini" },
  background_enhance: { model: "rhino-tensorrt", remove_color_shift: "true" },
  jpeg_quality: "90",
  interpolation: "bicubic",
  max_output_resolution: "3480",
};

// ═══ Full pipeline Remini mobile ═══
async function reminiMobileEnhance(buffer, pipeline = RM_DEFAULT_PIPELINE) {
  const state = await rmEnsureAuth();

  // metadata gambar (md5 base64 + ukuran + resolusi)
  let width = 0;
  let height = 0;
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    width = meta.width || 0;
    height = meta.height || 0;
  } catch {}
  const md5 = crypto.createHash("md5").update(buffer).digest("base64");
  const { mime } = guessMime(buffer);

  const body = {
    feature: { type: "multi-tool", pipelines: [pipeline] },
    image_content_type: mime,
    image_md5: md5,
    image_size: buffer.length,
  };
  if (width && height) {
    body.image_resolution_width = width;
    body.image_resolution_height = height;
  }

  // 1. buat task (401/403 → sekali regen device+token, lalu ulang)
  let task = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await rmApi.post(RM_TASKS, body, { headers: rmHeaders(state, "application/json; charset=UTF-8") });
    if (res.status === 401 || res.status === 403) {
      const fresh = { device: rmRandomDevice(), identity_token: null };
      await rmFetchToken(fresh);
      Object.assign(state, fresh);
      continue;
    }
    if (res.status !== 200 || !res.data?.task_id || !res.data?.upload_url || !res.data?.upload_headers) {
      throw new Error("task_failed");
    }
    task = res.data;
    break;
  }
  if (!task) throw new Error("task_failed");

  // 2. upload ke GCS pakai upload_headers yang dikasih server
  const up = await rmApi.put(task.upload_url, buffer, {
    headers: { ...task.upload_headers, "Content-Length": String(buffer.length), "User-Agent": "okhttp/4.12.0" },
    timeout: 120000,
  });
  if (up.status >= 300) throw new Error("upload_failed");

  // 3. trigger proses (Content-Length: 0 — WAJIB, kayak ping app asli)
  const pr = await rmApi.post(`${RM_TASKS}/${task.task_id}/process`, null, {
    headers: { ...rmHeaders(state), "Content-Length": "0" },
  });
  if (pr.status >= 300) throw new Error("process_failed");

  // 4. poll status (404 = belum siap, lanjut poll)
  const deadline = Date.now() + RM_POLL_MAX * RM_POLL_INTERVAL;
  let outputUrl = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, RM_POLL_INTERVAL));
    const st = await rmApi.get(`${RM_TASKS}/${task.task_id}`, { headers: rmHeaders(state) });
    if (st.status === 404) continue;
    if (st.status !== 200) throw new Error("poll_failed");
    const status = st.data?.status;
    if (status === "completed") {
      outputUrl = st.data?.result?.outputs?.[0]?.url;
      if (!outputUrl) throw new Error("no_output");
      break;
    }
    if (status === "failed" || status === "error") throw new Error("process_failed");
  }
  if (!outputUrl) throw new Error("timeout");

  // 5. download hasil
  const dl = await rmApi.get(outputUrl, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "okhttp/4.12.0" },
    timeout: 120000,
  });
  if (dl.status !== 200 || !dl.data) throw new Error("download_failed");
  return { buffer: Buffer.from(dl.data), label: "Face Restore (Remini)" };
}

// ═══ Handler ═══

async function handler(m, { sock, args }) {
  const img = m.isImage || (m.quoted && (m.quoted.type === "imageMessage" || m.quoted.isImage));

  if (!img) {
    return m.reply(claraWrap("remini", "Reply atau kirim gambar dengan caption .remini untuk face restore ala Remini asli, tanpa watermark. Mode: face (default), hd, real (restore 4x local), atau bp hd/16k/product/text/concert (BeautyPlus, bisa ada watermark).", "guide"), "remini");
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
    let engineNote = "Engine: Remini AI (tanpa watermark)";

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
      // ═══ Remini Mobile API — DEFAULT, face restore asli Remini tanpa watermark ═══
      try {
        try { await m.react("🎨"); } catch {}
        const r = await reminiMobileEnhance(mediaBuffer);
        resultBuffer = r.buffer;
        label = r.label;
        engineNote = "Engine: Remini AI (tanpa watermark)";
      } catch (e1) {
        console.error("[REMINI] Remini mobile gagal:", e1.message);
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
