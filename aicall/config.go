package main

import (
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	GroqAPI       string
	GeminiAPI     string
	GeminiModel   string
	AIProvider    string // "grok" (xAI) | "groq" (default — key owner 17 Sep) | "gemini"
	GrokAPI       string // xAI Grok key (env XAI_API / GROK_API)
	GrokModel     string // default "grok-3-mini"
	GroqChatModel string // model chat Groq, default "openai/gpt-oss-20b"
	AgentURL      string // gateway 9router (otak AI agent bot utama) — OpenAI-compatible
	AgentKey      string // key gateway 9router (dikirim per-request dari apikeys.json)
	AgentModel    string // default "ag/gemini-pro-agent"
	OpenAIAPI     string
	ElevenAPI     string
	SystemPrompt  string
	PromptLang    string
	TTSEngine     string // "geminitts", "edgetts", "elevenlabs", "openai", "animetts", "google"
	TTSCharacter  string
	TTSVoice      string // Voice for Gemini TTS ("Puck", "Kore", "Aoede"), Edge TTS ("ms-MY-YasminNeural"), OpenAI ("nova")
	ElevenVoiceID string // ElevenLabs Voice ID
	TTSLang       string
	TTSSpeed      float64
	TTSPitch      string // Edge TTS Pitch (e.g. "+0Hz", "-1Hz")
	Owners        []string
}

var AppConfig *Config

const DefaultSystemPrompt = `Kamu adalah asisten suara AI pintar yang sedang berbicara lewat panggilan telepon WhatsApp.
Aturan penting:
1. Jawablah dengan SINGKAT, RAMAH, dan ALAMI (maksimal 1-2 kalimat pendek, maksimal 25 kata).
2. JANGAN memberikan jawaban yang terlalu panjang, bertele-tele, atau berbentuk daftar agar suara telepon tidak terpotong.
3. JANGAN gunakan format markdown seperti bintang (*), pagar (#), bullet point (-), atau simbol tabel.
4. Gunakan Bahasa Indonesia yang santai dan sopan.`

func LoadConfig() *Config {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	groqAPI := os.Getenv("GROQ_API")
	if groqAPI == "" {
		groqAPI = os.Getenv("GROQ_API_KEY")
	}

	geminiAPI := os.Getenv("GEMINI_API")
	if geminiAPI == "" {
		geminiAPI = os.Getenv("GEMINI_API_KEY")
	}

	openAIAPI := os.Getenv("OPENAI_API")
	if openAIAPI == "" {
		openAIAPI = os.Getenv("OPENAI_API_KEY")
	}

	elevenAPI := os.Getenv("ELEVENLABS_API")
	if elevenAPI == "" {
		elevenAPI = os.Getenv("ELEVEN_API")
	}
	if elevenAPI == "" {
		elevenAPI = os.Getenv("ELEVENLABS_API_KEY")
	}

	geminiModel := os.Getenv("GEMINI_MODEL")
	if geminiModel == "" {
		geminiModel = "gemini-3.1-flash-lite"
	}

	// ── AI Provider percakapan (request owner 17 Sep 2026: "cba pakai apikey
	// grok ai callnya dlu" — default GROK selama key Gemini belum dibenerin) ──
	aiProvider := strings.ToLower(strings.TrimSpace(os.Getenv("AI_PROVIDER")))
	grokAPI := os.Getenv("XAI_API")
	if grokAPI == "" {
		grokAPI = os.Getenv("GROK_API") // alias — HATI-HATI beda sama GROQ_API (Groq STT)
	}
	if grokAPI == "" {
		grokAPI = os.Getenv("XAI_API_KEY")
	}
	grokModel := os.Getenv("GROK_MODEL")
	if grokModel == "" {
		grokModel = "grok-3-mini"
	}
	groqChatModel := os.Getenv("GROQ_CHAT_MODEL")
	if groqChatModel == "" {
		groqChatModel = "openai/gpt-oss-20b"
	}

	// 🔹 GATEWAY 9ROUTER (owner 26 Sep 2026: "kalau key Grok gak dipasang
	// karena mahal, fallback ke ai biasa — tembak ke ai agent"). OpenAI-
	// compatible, key + endpoint sama dengan provider tio_* bot utama.
	agentURL := os.Getenv("ROUTER9_API_URL")
	if agentURL == "" {
		agentURL = os.Getenv("TIO_API_URL")
	}
	if agentURL == "" {
		agentURL = "https://9router.cloudku.us.kg/v1/chat/completions"
	}
	agentKey := os.Getenv("ROUTER9_API_KEY")
	if agentKey == "" {
		agentKey = os.Getenv("TIO_API_KEY")
	}
	agentModel := os.Getenv("ROUTER9_MODEL")
	if agentModel == "" {
		agentModel = "ag/gemini-pro-agent"
	}
	if aiProvider == "" {
		// urutan otomatis: grok (xAI) → groq → gemini, sesuai key yang ada
		if grokAPI != "" {
			aiProvider = "grok"
		} else if agentKey != "" {
			aiProvider = "agent" // gateway 9router = otak AI agent bot utama (26 Sep)
		} else if groqAPI != "" {
			aiProvider = "groq" // key owner 17 Sep 2026 (gsk_) — Groq super cepat
		} else {
			aiProvider = "gemini"
		}
	}

	sysPrompt := os.Getenv("SYSTEM_PROMPT")
	if sysPrompt == "" {
		sysPrompt = DefaultSystemPrompt
	}

	promptLang := os.Getenv("PROMPT_LANG")
	if promptLang == "" {
		promptLang = "id"
	}

	ttsEngine := strings.ToLower(strings.TrimSpace(os.Getenv("TTS_ENGINE")))
	if ttsEngine == "" {
		if elevenAPI != "" {
			ttsEngine = "elevenlabs"
		} else if openAIAPI != "" {
			ttsEngine = "openai"
		} else {
			ttsEngine = "edgetts"
		}
	}

	ttsChar := os.Getenv("TTS_CHARACTER")
	if ttsChar == "" {
		ttsChar = "特别周 Special Week (Umamusume Pretty Derby)"
	}

	ttsVoice := os.Getenv("TTS_VOICE")
	if ttsVoice == "" {
		if ttsEngine == "edgetts" {
			ttsVoice = "ms-MY-YasminNeural"
		} else if ttsEngine == "geminitts" {
			ttsVoice = "Puck"
		} else {
			ttsVoice = "nova"
		}
	}

	elevenVoiceID := os.Getenv("ELEVEN_VOICE_ID")
	if elevenVoiceID == "" {
		elevenVoiceID = os.Getenv("ELEVENLABS_VOICE_ID")
	}
	if elevenVoiceID == "" {
		elevenVoiceID = "21m00Tcm4TlvDq8ikWAM" // Rachel
	}

	ttsLang := os.Getenv("TTS_LANG")
	if ttsLang == "" {
		ttsLang = "Mix"
	}

	ttsSpeedStr := os.Getenv("TTS_SPEED")
	ttsSpeed := 1.0
	if ttsSpeedStr != "" {
		if val, err := strconv.ParseFloat(ttsSpeedStr, 64); err == nil && val > 0 {
			ttsSpeed = val
		}
	}

	ttsPitch := os.Getenv("TTS_PITCH")
	if ttsPitch == "" {
		ttsPitch = "-1Hz"
	}

	ownerStr := os.Getenv("OWNER")
	var owners []string
	if ownerStr != "" {
		parts := strings.Split(ownerStr, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				owners = append(owners, p)
			}
		}
	}

	AppConfig = &Config{
		GroqAPI:       groqAPI,
		GeminiAPI:     geminiAPI,
		GeminiModel:   geminiModel,
		AIProvider:    aiProvider,
		GrokAPI:       grokAPI,
		GrokModel:     grokModel,
		GroqChatModel: groqChatModel,
		AgentURL:      agentURL,
		AgentKey:      agentKey,
		AgentModel:    agentModel,
		OpenAIAPI:     openAIAPI,
		ElevenAPI:     elevenAPI,
		SystemPrompt:  sysPrompt,
		PromptLang:    promptLang,
		TTSEngine:     ttsEngine,
		TTSCharacter:  ttsChar,
		TTSVoice:      ttsVoice,
		ElevenVoiceID: elevenVoiceID,
		TTSLang:       ttsLang,
		TTSSpeed:      ttsSpeed,
		TTSPitch:      ttsPitch,
		Owners:        owners,
	}

	if AppConfig.GroqAPI == "" {
		log.Println("[WARNING] GROQ_API key is missing in .env! STT functionality might fail.")
	}
	if AppConfig.GeminiAPI == "" {
		log.Println("[WARNING] GEMINI_API key is missing in .env! AI chat functionality might fail.")
	}
	if AppConfig.AIProvider == "grok" && AppConfig.GrokAPI == "" {
		log.Println("[WARNING] AI_PROVIDER=grok tapi XAI_API key kosong! AI chat akan fallback ke agent/groq/gemini.")
	}
	if AppConfig.AIProvider == "agent" && AppConfig.AgentURL == "" {
		log.Println("[WARNING] AI_PROVIDER=agent tapi ROUTER9_API_URL kosong! AI chat akan fallback ke groq/gemini.")
	}

	tempDir := filepath.Join(".", "temp")
	_ = os.MkdirAll(tempDir, 0755)

	return AppConfig
}

func IsOwner(sender string) bool {
	// Owner 26 Sep 2026: "aicall cm owner only aja yg bsa gunakan" —
	// mode publik DIHAPUS. Tanpa daftar owner (OWNER= kosong di .env),
	// service terkunci penuh: SEMUA panggilan & command ditolak.
	if len(AppConfig.Owners) == 0 {
		return false
	}
	cleanedSender := strings.TrimPrefix(sender, "+")
	cleanedSender = strings.Split(cleanedSender, "@")[0]
	cleanedSender = strings.Split(cleanedSender, ".")[0]
	cleanedSender = strings.TrimSpace(cleanedSender)

	for _, owner := range AppConfig.Owners {
		cleanedOwner := strings.TrimPrefix(owner, "+")
		cleanedOwner = strings.Split(cleanedOwner, "@")[0]
		cleanedOwner = strings.TrimSpace(cleanedOwner)
		if cleanedOwner == "" {
			continue
		}
		if cleanedSender == cleanedOwner || strings.HasSuffix(cleanedSender, cleanedOwner) || strings.HasPrefix(cleanedSender, cleanedOwner) {
			return true
		}
	}
	return false
}
