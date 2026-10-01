// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ChatEverywhere Scraper — Puppeteer-based untuk bypass Vercel Security Checkpoint
// Free GPT-4o-mini tanpa API key
//
// INSTALL (pilih salah satu):
//
// 1. VPS langsung (PM2):
//    npm install puppeteer
//    (puppeteer akan auto-download chromium ~170MB)
//
// 2. VPS dengan chromium sudah terinstall:
//    npm install puppeteer-core
//    export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
//
// 3. Docker (Pterodactyl/Koyeb):
//    Dockerfile sudah di-update dengan chromium + puppeteer-core
//    Build ulang image: docker build -t rara-bot .

let browserInstance = null;
let pageInstance = null;
let lastUse = 0;
const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 menit idle → close browser
const MAX_RETRIES = 2;

async function loadPuppeteer() {
  // Try puppeteer-core first (lighter, uses system chromium)
  try {
    const puppeteer = await import("puppeteer-core");
    return { puppeteer: puppeteer.default, isCore: true };
  } catch {
    // Fallback to full puppeteer (downloads its own chromium)
    try {
      const puppeteer = await import("puppeteer");
      return { puppeteer: puppeteer.default, isCore: false };
    } catch {
      throw new Error(
        "Puppeteer belum diinstall. Install dengan:\n" +
        "  VPS/PM2: npm install puppeteer\n" +
        "  Docker:  npm install puppeteer-core (chromonium sudah di Dockerfile)\n" +
        "  Atau:    npm install puppeteer-core && set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium"
      );
    }
  }
}

function getChromiumPath() {
  // Cek environment variable dulu
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  // Common paths
  const paths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  // puppeteer (full) akan handle sendiri kalau null
  return null;
}

async function getBrowser() {
  const { puppeteer, isCore } = await loadPuppeteer();

  // Reuse browser jika masih hidup
  if (browserInstance && Date.now() - lastUse < SESSION_TIMEOUT) {
    try {
      const pages = await browserInstance.pages();
      if (pages) {
        lastUse = Date.now();
        return browserInstance;
      }
    } catch {
      browserInstance = null;
      pageInstance = null;
    }
  }

  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--single-process",
      "--disable-extensions",
      "--disable-software-rasterizer",
    ],
    timeout: 20000,
  };

  // Kalau puppeteer-core, perlu specify executablePath
  if (isCore) {
    const chromePath = getChromiumPath();
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
  }

  browserInstance = await puppeteer.launch(launchOptions);
  pageInstance = await browserInstance.newPage();
  await pageInstance.setUserAgent(
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
  );
  await pageInstance.setViewport({ width: 412, height: 915 });

  lastUse = Date.now();
  return browserInstance;
}

async function closeBrowser() {
  try {
    if (browserInstance) await browserInstance.close();
  } catch {}
  browserInstance = null;
  pageInstance = null;
}

async function solveVercelCheckpoint(page) {
  try {
    await page.waitForFunction(
      () => {
        const title = document.title.toLowerCase();
        if (title.includes("security checkpoint") || title.includes("vercel")) return false;
        return !!document.querySelector("textarea");
      },
      { timeout: 15000, polling: 1000 }
    );
    return true;
  } catch {
    return false;
  }
}

async function ChatEverywhere(prompt, options = {}) {
  const {
    systemPrompt = "You are a helpful AI assistant. Answer in Indonesian if the user speaks Indonesian. Be concise and friendly.",
    model = "gpt-4o-mini",
  } = options;

  let retryCount = 0;

  while (retryCount <= MAX_RETRIES) {
    try {
      const browser = await getBrowser();
      const page = pageInstance || (await browser.newPage());

      // Navigate ke chateverywhere.app
      await page.goto("https://chateverywhere.app/id", {
        waitUntil: "networkidle2",
        timeout: 20000,
      });

      // Solve Vercel checkpoint
      const passed = await solveVercelCheckpoint(page);
      if (!passed) {
        console.error("ChatEverywhere: Vercel checkpoint failed");
        retryCount++;
        await closeBrowser();
        continue;
      }

      // Wait for textarea
      await page.waitForSelector("textarea", { timeout: 10000 }).catch(() => {});
      const textarea = await page.$("textarea");
      if (!textarea) {
        retryCount++;
        await closeBrowser();
        continue;
      }

      // Type message — combine system prompt + user prompt
      const fullMessage = systemPrompt ? `[System: ${systemPrompt}]\n\n${prompt}` : prompt;

      await textarea.click();
      await textarea.type(fullMessage, { delay: 10 });
      await new Promise((r) => setTimeout(r, 500));

      // Kirim — cari send button atau tekan Enter
      const sent = await page.evaluate(() => {
        // Cari button dengan IconSend (tabler icons)
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
          const svg = btn.querySelector("svg");
          if (svg) {
            // IconSend punya path khas
            if (svg.innerHTML.includes("path") && btn.closest("form")) return btn;
          }
        }
        // Fallback: button terakhir di form
        const form = document.querySelector("form");
        if (form) {
          const formBtns = form.querySelectorAll("button");
          return formBtns[formBtns.length - 1];
        }
        return null;
      });

      if (sent && sent.click) {
        await sent.click();
      } else {
        await page.keyboard.press("Enter");
      }

      // Capture response — tunggu assistant message muncul
      let responseText = "";
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;

        try {
          responseText = await page.evaluate(() => {
            // Chat Everywhere (chatbot-ui fork) render messages di:
            // - .prose (markdown content)
            // - [class*="message"] 
            // - div dengan whitespace-pre-wrap
            const selectors = [
              ".prose",
              "[class*='message']:not([class*='input'])",
              "div.whitespace-pre-wrap",
              "div[class*='markdown']",
              "div[class*='response']",
              "div[class*='assistant']",
            ];

            for (const sel of selectors) {
              const elements = document.querySelectorAll(sel);
              if (elements.length > 0) {
                const last = elements[elements.length - 1];
                const text = last.innerText || last.textContent || "";
                if (text.length > 5 && !text.includes("Type a message")) return text;
              }
            }

            // Fallback: semua teks di main area, ambil paragraf terakhir
            const main = document.querySelector("main") || document.querySelector("[class*='chat']");
            if (main) {
              const allText = main.innerText || "";
              const lines = allText.split("\n").filter((l) => l.trim().length > 10);
              if (lines.length > 1) return lines[lines.length - 1];
            }
            return "";
          });

          if (responseText && responseText.length > 10 && !responseText.includes(fullMessage)) {
            // Wait 2s lagi untuk streaming selesai
            await new Promise((r) => setTimeout(r, 2000));
            const finalText = await page.evaluate(() => {
              const selectors = [".prose", "div.whitespace-pre-wrap", "div[class*='markdown']"];
              for (const sel of selectors) {
                const elements = document.querySelectorAll(sel);
                if (elements.length > 0) {
                  const last = elements[elements.length - 1];
                  const text = last.innerText || last.textContent || "";
                  if (text.length > 5) return text;
                }
              }
              return "";
            });
            if (finalText && finalText.length >= responseText.length) {
              responseText = finalText;
            }
            break;
          }
        } catch {}
      }

      // Clean response
      if (responseText) {
        responseText = responseText
          .replace(/^\[System:.*?\]\s*/s, "")
          .replace(/^You are a helpful.*?\n/s, "")
          .trim();
      }

      if (responseText && responseText.length > 5) {
        lastUse = Date.now();
        return {
          status: true,
          code: 200,
          model: model,
          answer: responseText,
        };
      }

      retryCount++;
      await closeBrowser();
    } catch (err) {
      console.error(`ChatEverywhere attempt ${retryCount + 1}:`, err.message);
      retryCount++;
      await closeBrowser();
    }
  }

  return {
    status: false,
    code: 500,
    model: model,
    answer: "",
    error: "Gagal mengakses ChatEverywhere setelah beberapa percobaan. Pastikan puppeteer terinstall.",
  };
}

async function ChatEverywhereClose() {
  await closeBrowser();
}

export { ChatEverywhere, ChatEverywhereClose };
