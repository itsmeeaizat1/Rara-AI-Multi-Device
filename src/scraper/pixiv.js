// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// src/scraper/pixiv.js — PIXIV DIRECT ENGINE (ala Mori)
// Sumber referensi: github.com/coflyn/Mori — Pixiv AJAX API.
// Pattern VERIFIED LIVE 2026-09-07:
//   GET www.pixiv.net/ajax/illust/{id} → 200 (tanpa login) — illustTitle,
//   userName, urls.original/regular, pageCount, illustType.
//   Multi-page: GET /ajax/illust/{id}/pages → body[].urls.regular/original.
//   Download file wajib header Referer: https://www.pixiv.net/ (i.pximg.net
//   nolak tanpa referer).
// Ugoira (illustType 2): /ajax/illust/{id}/ugoira_meta → zip frames → ffmpeg.

import axios from "axios";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const execFileP = promisify(execFile);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const HEADERS = { "User-Agent": UA, Referer: "https://www.pixiv.net/" };

export function extractPixivId(url) {
  const s = String(url || "");
  let m = s.match(/pixiv\.net\/(?:[a-zA-Z-]+\/)?artworks\/(\d+)/);
  if (m) return m[1];
  m = s.match(/[?&]illust_id=(\d+)/);
  if (m) return m[1];
  m = s.match(/pixiv\.net\/(?:[a-zA-Z-]+\/)?member_illust\.php/);
  if (m) return null;
  return null;
}

async function fetchJson(url) {
  const res = await axios.get(url, { headers: HEADERS, timeout: 30000 });
  const j = res.data;
  if (j.error !== false && j.error !== undefined && j.error !== null) {
    throw new Error(j.message || "Pixiv AJAX nolak request");
  }
  return j.body || j;
}

// Download file pximg ke path tujuan (stream biar hemat memory).
export async function downloadPixivFile(url, destPath) {
  const res = await axios.get(url, {
    headers: HEADERS,
    responseType: "stream",
    timeout: 60000,
  });
  await pipeline(res.data, createWriteStream(destPath));
  return destPath;
}

export async function pixivDownload(url) {
  const id = extractPixivId(url);
  if (!id) throw new Error("Gak nemu ID illust di link pixiv");

  const meta = await fetchJson(`https://www.pixiv.net/ajax/illust/${id}`);
  const isUgoira = meta.illustType === 2;

  // Ugoira: download zip frames + convert mp4 via ffmpeg (folder tmp)
  if (isUgoira) {
    const ugo = await fetchJson(`https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`);
    const zipUrl = ugo?.originalSrc || ugo?.src || ugo?.zipUrls?.original;
    const frames = ugo?.frames || [];
    if (!zipUrl || !frames.length) throw new Error("Meta ugoira gak lengkap");
    throw new Error("UGOIRA_PLACEHOLDER");
    // Penanganan ugoira penuh dikerjakan di plugin (butuh ffmpeg + tmp dir).
  }

  // Image (single / multi-page)
  const pageCount = Number(meta.pageCount || 1);
  const urls = [];
  if (pageCount > 1) {
    const pages = await fetchJson(`https://www.pixiv.net/ajax/illust/${id}/pages`);
    for (const p of pages || []) {
      const u = p?.urls?.original || p?.urls?.regular;
      if (u) urls.push(u);
    }
  } else {
    urls.push(meta.urls?.original || meta.urls?.regular);
  }
  if (!urls.length || !urls[0]) throw new Error("URL gambar gak ketemu");

  return {
    status: true,
    type: "image",
    pageCount,
    title: meta.illustTitle || `Pixiv ${id}`,
    author: meta.userName || null,
    authorHandle: meta.userAccount || null,
    art: meta.urls?.small || meta.urls?.regular || null,
    urls, // wajib di-download pakai Referer pixiv.net
    tags: (meta.tags?.tags || []).map((t) => t.tag).slice(0, 5),
  };
}

// Ugoira → MP4: dipisah biar plugin yang pegang ffmpeg & tmpdir.
// Frames delay tiap ~1/6 detik — concat pakai demuxer ffmpeg.
export async function pixivUgoiraToMp4(zipUrl, frames, destPath, tmpDir) {
  const zipPath = join(tmpDir, "ugoira.zip");
  await downloadPixivFile(zipUrl, zipPath);
  await execFileP("unzip", ["-o", zipPath, "-d", join(tmpDir, "frames")]);
  // Concat file demuxer: durasi per-frame dari ugoira_meta (ms)
  let concat = "";
  for (const f of frames) {
    const delay = Math.max(1, Math.round((f.delay || 125) / 1000 * 100) / 100);
    concat += `file 'frames/${f.file}'\nduration ${delay}\n`;
  }
  concat += `file 'frames/${frames[frames.length - 1].file}'\n`;
  await writeFile(join(tmpDir, "concat.txt"), concat);
  await execFileP("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0",
    "-i", join(tmpDir, "concat.txt"),
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    destPath,
  ]);
  return destPath;
}

