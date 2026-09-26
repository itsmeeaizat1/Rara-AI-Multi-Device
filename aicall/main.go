package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/mdp/qrterminal/v3"
	"github.com/purpshell/meowcaller"
	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	_ "modernc.org/sqlite"
)

// ═══ INTEGRASI NOVA BOT (17 Sep 2026, request owner "gmna supaya bot aku
// support tlpon kesambung ai pakai fitur ini") ═══
// Service ini jalan BERSAMA bot utama Node.js (Baileys gak support VOIP
// call WhatsApp). Bot utama manggil lewat HTTP lokal (plugin .aicall):
//
//	POST /call    {"number":"628xxx","gemini_api":"","groq_api":""}
//	POST /config  {"engine":"edgetts","voice":"id-ID-GadisNeural"}
//	GET  /health  status sesi + config aktif
//
// Chat command service ini (default OFF via COMMANDS_ENABLED=false) biar gak
// dobalas dengan bot utama.
var botStartTime = time.Now()

var (
	waClientRef *whatsmeow.Client
	callerRef   *meowcaller.Client
	aicallMu    sync.Mutex // guard mutasi AppConfig via HTTP
	commandsOn  bool       // COMMANDS_ENABLED=true → chat command aktif
)

// 🔹 TRACKER PANGGILAN AKTIF — satu panggilan AI per waktu (owner 26 Sep).
// activeCallPeer = nomor user yang lagi telepon; kosong = bebas.
var (
	activeCallMu   sync.Mutex
	activeCallPeer string
)

func clearActiveCall(peer string) {
	activeCallMu.Lock()
	defer activeCallMu.Unlock()
	if activeCallPeer == peer {
		activeCallPeer = ""
	}
}

func main() {
	log.Println("==================================================")
	log.Println("     WhatsApp AI Call Assistant Bot (Golang)      ")
	log.Println("==================================================")

	// Load configuration from .env
	cfg := LoadConfig()

	// ── AI_CHAT_TEST=1 → tes otak AI (provider aktif + fallback) sekali lalu keluar.
	// Verifikasi key/model live tanpa harus panggilan beneran.
	if os.Getenv("AI_CHAT_TEST") == "1" {
		conv := NewConversation()
		reply, err := conv.Chat("Jawab dengan satu kata: siap")
		if err != nil {
			fmt.Println("[AI_CHAT_TEST] GAGAL — provider '"+cfg.AIProvider+"':", err)
			os.Exit(1)
		}
		fmt.Printf("[AI_CHAT_TEST] OK — provider '%s' jawab: %s\n", cfg.AIProvider, reply)
		os.Exit(0)
	}

	log.Printf("[Config] GROQ_API status: %t", cfg.GroqAPI != "")
	log.Printf("[Config] GEMINI_API status: %t", cfg.GeminiAPI != "")
	log.Printf("[Config] GEMINI_MODEL: %s", cfg.GeminiModel)
	log.Printf("[Config] AI PROVIDER: %s (grok model: %s | groq chat: %s)", cfg.AIProvider, cfg.GrokModel, cfg.GroqChatModel)
	log.Printf("[Config] TTS Character: %s", cfg.TTSCharacter)
	log.Printf("[Config] TTS Speed: %.1f", cfg.TTSSpeed)
	if len(cfg.Owners) > 0 {
		log.Printf("[Config] Owners configured: %v", cfg.Owners)
	} else {
		log.Println("[Config] Owners: Public (Anyone can call)")
	}

	// Setup SQLite container store for WhatsApp session
	dbLog := waLog.Stdout("Database", "WARN", true)
	container, err := sqlstore.New(context.Background(), "sqlite", "file:ai_call_session.db?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)", dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to SQLite database: %v", err)
	}

	deviceStore, err := container.GetFirstDevice(context.Background())
	if err != nil {
		log.Fatalf("Failed to get device store: %v", err)
	}

	// Create whatsmeow client
	clientLog := waLog.Stdout("Client", "INFO", true)
	waClient := whatsmeow.NewClient(deviceStore, clientLog)

	// Initialize meowcaller client
	callerClient := meowcaller.NewClient(waClient)

	// Setup Incoming Call Handler
	callerClient.OnIncomingCall(func(call *meowcaller.Call) {
		peer := call.Peer().User
		log.Printf("[Call] Incoming call from %s (Call ID: %s)", call.Peer().String(), call.ID())

		// Owner 26 Sep: user biasa BOLEH telepon AI asal PREMIUM (ceker
		// premium via bridge bot utama POST /acl). Non-owner non-premium
		// ditolak; owner selalu lolos walau bridge mati.
		if callerACLViaBridge(peer) == "none" {
			log.Printf("[Call] Rejecting incoming call from non-owner/non-premium: %s", peer)
			_ = call.Reject()
			return
		}

		// 🔹 SATU PANGGILAN SEKALIGUS (owner 26 Sep: "user lain mau telepon
		// → gak diangkat penuh, AI bilang lagi ada user telepon, mohon
		// menunggu"). Kalau lagi sibuk: diangkat SEBENTAR → AI ngomong
		// sendiri "sedang ada pengguna lain" → ditutup lagi, sesi pertama
		// gak tersentuh.
		activeCallMu.Lock()
		busyWith := ""
		if activeCallPeer != "" && activeCallPeer != peer {
			busyWith = activeCallPeer
		} else {
			activeCallPeer = peer
		}
		activeCallMu.Unlock()
		if busyWith != "" {
			log.Printf("[Call] Line busy — active call with %s; telling %s to wait", busyWith, peer)
			if err := call.Answer(); err != nil {
				log.Printf("[Call] Failed to answer busy call: %v (reject)", err)
				_ = call.Reject()
				return
			}
			// ngomong + tutup di goroutine — handler gak keblok (callback
			// dipakai meowcaller buat event lain juga)
			go func() {
				sess := NewAICallSession(call)
				sess.speakText("Maaf, saat ini saya sedang mengobrol dengan pengguna lain. Mohon menunggu telepon berakhir atau silakan coba lagi nanti ya.")
				sess.Stop()
				_ = call.Hangup()
			}()
			return
		}

		// Answer incoming call
		if err := call.Answer(); err != nil {
			log.Printf("[Call] Failed to answer call: %v", err)
			clearActiveCall(peer)
			return
		}

		session := NewAICallSession(call)
		call.OnEnd(func(reason string) {
			log.Printf("[Call] Call ended (Reason: %s)", reason)
			session.Stop()
			clearActiveCall(peer)
		})

		// Start AI Voice Loop in background
		go session.StartVoiceLoop()
	})

	// Simpan referensi global buat handler HTTP
	waClientRef = waClient
	callerRef = callerClient

	// COMMANDS_ENABLED (default false): chat command di service ini MATI —
	// semua akses lewat plugin .aicall di bot utama (biar gak dobalas
	// .menu/.status dengan bot utama). Set "true" kalau jalan standalone.
	commandsOn = strings.EqualFold(strings.TrimSpace(os.Getenv("COMMANDS_ENABLED")), "true")

	// Setup Message Handler for commands (e.g., !aicall 628xxx)
	waClient.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			if commandsOn {
				handleMessage(waClient, callerClient, v)
			}
		}
	})

	// ═══ HTTP API lokal — dipakai plugin .aicall bot utama ═══
	startHTTPAPI()

	// QR Code / PAIRING CODE Login
	// PAIR_PHONE=62xxx → login pakai 8-digit pairing code (cocok VPS, gak
	// perlu scan QR). Kosong → QR code seperti biasa.
	if waClient.Store.ID == nil {
		pairPhone := strings.TrimSpace(os.Getenv("PAIR_PHONE"))
		pairShown := false
		qrChan, _ := waClient.GetQRChannel(context.Background())
		err = waClient.Connect()
		if err != nil {
			log.Fatalf("Failed to connect: %v", err)
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				if pairPhone != "" {
					if !pairShown {
						pairShown = true
						pairCode, perr := waClient.PairPhone(context.Background(), pairPhone, false, whatsmeow.PairClientChrome, "Chrome (Linux)")
						if perr != nil {
							log.Printf("[Login] Gagal buat pairing code (%v) — fallback ke QR.", perr)
							fmt.Println("\nScan QR Code dibawah ini menggunakan WhatsApp di HP Anda:")
							qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
						} else {
							fmt.Printf("\n==================================================\n")
							fmt.Printf("   PAIRING CODE: %s\n", pairCode)
							fmt.Printf("==================================================\n")
							fmt.Println("HP WhatsApp -> Setelan -> Perangkat Tertaut ->")
							fmt.Println("Tautkan Perangkat -> Tautkan dgn Nomor Telepon -> masukkan kode di atas.")
						}
					}
				} else {
					fmt.Println("\nScan QR Code dibawah ini menggunakan WhatsApp di HP Anda:")
					qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
				}
			} else {
				fmt.Printf("QR Event: %s\n", evt.Event)
			}
		}
	} else {
		err = waClient.Connect()
		if err != nil {
			log.Fatalf("Failed to connect: %v", err)
		}
		log.Println("Berhasil terhubung ke WhatsApp!")
	}

	// Keep program running until interrupt signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down AI Call Assistant...")
	waClient.Disconnect()
}

func handleMessage(client *whatsmeow.Client, callerClient *meowcaller.Client, msg *events.Message) {
	if msg.Info.IsFromMe {
		return
	}

	body := getMessageBody(msg.Message)
	if body == "" {
		return
	}

	fields := strings.Fields(body)
	if len(fields) == 0 {
		return
	}
	cmd := strings.ToLower(fields[0])

	switch cmd {
	case "!help", ".help", "!menu", ".menu":
		helpText := fmt.Sprintf(`🤖 *WHATSAPP AI CALL ASSISTANT BOT* 🤖

📌 *Perintah Utama:*
• *!aicall <nomor>* / *.call <nomor>*
  ↳ Melakukan panggilan telepon AI ke nomor tujuan.

⚙️ *Pengaturan Live Engine (Owner Only):*
• *!engine <nama_engine>*
  ↳ Ganti Engine TTS live (edgetts / geminitts / elevenlabs / openai / animetts).
• *!voice <nama_suara>*
  ↳ Ganti suara TTS live (contoh: ms-MY-YasminNeural, id-ID-ArdiNeural, Puck, nova).

📊 *Informasi & Status Bot:*
• *!status* / *.ping*
  ↳ Cek status sistem, uptime, memori, & rincian bot.
• *!owner* / *.owner*
  ↳ Cek status whitelist owner bot.
• *!help* / *.menu*
  ↳ Menampilkan menu bantuan ini.

-----------------------------------
ℹ️ *Konfigurasi Aktif:*
• AI Model  : %s
• TTS Engine: %s
• TTS Voice : %s
• Pitch     : %s`, AppConfig.GeminiModel, AppConfig.TTSEngine, AppConfig.TTSVoice, AppConfig.TTSPitch)
		sendReply(client, msg, helpText)

	case "!status", ".status", "!ping", ".ping":
		uptime := time.Since(botStartTime).Truncate(time.Second)
		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)
		allocMB := float64(memStats.Alloc) / 1024 / 1024

		statusText := fmt.Sprintf(`⚡ *BOT STATUS & SYSTEM METRICS* ⚡

• *Status Connection*: Connected (Online)
• *Bot Uptime*      : %s
• *Memory Usage*    : %.2f MB
• *Goroutines*      : %d
• *AI Model*        : %s
• *TTS Engine*      : %s
• *TTS Voice*       : %s
• *Owner Restricted*: %t`, uptime, allocMB, runtime.NumGoroutine(), AppConfig.GeminiModel, AppConfig.TTSEngine, AppConfig.TTSVoice, len(AppConfig.Owners) > 0)
		sendReply(client, msg, statusText)

	case "!owner", ".owner":
		var ownerText string
		if len(AppConfig.Owners) > 0 {
			ownerText = fmt.Sprintf("👑 *DAFTAR OWNER BOT:*\n• %s\n\n_Hanya nomor terdaftar di atas yang dapat menggunakan perintah panggilan AI._", strings.Join(AppConfig.Owners, "\n• "))
		} else {
			ownerText = "🔒 *STATUS BOT:* Terkunci — OWNER belum di-set di aicall/.env. Isi OWNER=62xxx lalu restart service; sementara SEMUA panggilan ditolak."
		}
		sendReply(client, msg, ownerText)

	case "!engine", ".engine":
		senderUser := msg.Info.Sender.User
		if !IsOwner(senderUser) {
			sendReply(client, msg, "Maaf, perintah ini hanya dapat digunakan oleh Owner bot.")
			return
		}
		if len(fields) < 2 {
			sendReply(client, msg, "Gunakan format: !engine <edgetts|geminitts|elevenlabs|openai|animetts>")
			return
		}
		newEngine := strings.ToLower(fields[1])
		switch newEngine {
		case "edgetts", "geminitts", "elevenlabs", "openai", "animetts", "google":
			AppConfig.TTSEngine = newEngine
			if newEngine == "geminitts" {
				AppConfig.TTSVoice = "Puck"
			} else if newEngine == "edgetts" {
				AppConfig.TTSVoice = "ms-MY-YasminNeural"
			}
			sendReply(client, msg, fmt.Sprintf("✅ Berhasil mengubah TTS Engine ke: *%s* (Voice Default: %s)", newEngine, AppConfig.TTSVoice))
		default:
			sendReply(client, msg, "Engine tidak valid. Opsi yang tersedia: edgetts, geminitts, elevenlabs, openai, animetts, google.")
		}

	case "!voice", ".voice":
		senderUser := msg.Info.Sender.User
		if !IsOwner(senderUser) {
			sendReply(client, msg, "Maaf, perintah ini hanya dapat digunakan oleh Owner bot.")
			return
		}
		if len(fields) < 2 {
			sendReply(client, msg, "Gunakan format: !voice <nama_suara>\nContoh: !voice ms-MY-YasminNeural")
			return
		}
		newVoice := fields[1]
		AppConfig.TTSVoice = newVoice
		sendReply(client, msg, fmt.Sprintf("✅ Berhasil mengubah TTS Voice ke: *%s*", newVoice))

	case "!aicall", ".aicall", "!call", ".call":
		senderUser := msg.Info.Sender.User
		if !IsOwner(senderUser) {
			log.Printf("[Command] Denied call command from non-owner: %s", senderUser)
			sendReply(client, msg, "Maaf, fitur ini hanya dapat digunakan oleh Owner bot.")
			return
		}

		if len(fields) < 2 {
			sendReply(client, msg, "Gunakan format: !aicall 628xxxxxxxx")
			return
		}

		targetNum := fields[1]
		targetNum = strings.TrimPrefix(targetNum, "+")
		targetNum = strings.ReplaceAll(targetNum, "-", "")
		targetNum = strings.ReplaceAll(targetNum, " ", "")

		if targetNum == "" {
			sendReply(client, msg, "Gunakan format: !aicall 628xxxxxxxx")
			return
		}

		targetJID := types.NewJID(targetNum, types.DefaultUserServer)
		sendReply(client, msg, fmt.Sprintf("Memulai panggilan AI ke nomor %s...", targetNum))

		ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()

		log.Printf("[Command] Dialing %s for AI call...", targetJID.String())
		call, err := callerClient.Call(ctx, targetJID.String())
		if err != nil {
			log.Printf("[Command] Failed to place call: %v", err)
			sendReply(client, msg, fmt.Sprintf("Gagal menelpon: %v", err))
			return
		}

		session := NewAICallSession(call)
		call.OnEnd(func(reason string) {
			log.Printf("[Call] Call with %s ended: %s", targetJID.String(), reason)
			session.Stop()
		})

		call.OnReady(func() {
			log.Printf("[Call] Call connected with %s! Starting AI voice loop...", targetJID.String())
			go session.StartVoiceLoop()
		})
	}
}

func sendReply(client *whatsmeow.Client, msg *events.Message, text string) {
	participant := msg.Info.Sender.String()
	stanzaID := msg.Info.ID

	_, _ = client.SendMessage(context.Background(), msg.Info.Chat, &waProto.Message{
		ExtendedTextMessage: &waProto.ExtendedTextMessage{
			Text: buildStringPointer(text),
			ContextInfo: &waProto.ContextInfo{
				StanzaID:      buildStringPointer(stanzaID),
				Participant:   buildStringPointer(participant),
				QuotedMessage: msg.Message,
			},
		},
	})
}

func getMessageBody(m *waProto.Message) string {
	if m == nil {
		return ""
	}
	if m.GetEphemeralMessage() != nil {
		return getMessageBody(m.GetEphemeralMessage().GetMessage())
	}
	if m.GetViewOnceMessage() != nil {
		return getMessageBody(m.GetViewOnceMessage().GetMessage())
	}
	if m.GetViewOnceMessageV2() != nil {
		return getMessageBody(m.GetViewOnceMessageV2().GetMessage())
	}
	if m.GetDocumentWithCaptionMessage() != nil {
		return getMessageBody(m.GetDocumentWithCaptionMessage().GetMessage())
	}
	if m.GetConversation() != "" {
		return m.GetConversation()
	}
	if m.GetExtendedTextMessage() != nil {
		return m.GetExtendedTextMessage().GetText()
	}
	return ""
}

func buildStringPointer(s string) *string {
	return &s
}

// ═══════════════ HTTP API (plugin .aicall bot utama) ═══════════════

type callRequest struct {
	Number       string `json:"number"`
	GeminiAPI    string `json:"gemini_api,omitempty"`
	GroqAPI      string `json:"groq_api,omitempty"`
	GrokAPI      string `json:"grok_api,omitempty"`  // xAI Grok — otak percakapan (owner 17 Sep)
	AgentURL     string `json:"agent_url,omitempty"` // gateway 9router — otak AI agent (owner 26 Sep)
	AgentKey     string `json:"agent_key,omitempty"`
	AgentModel   string `json:"agent_model,omitempty"`
	AIProvider   string `json:"ai_provider,omitempty"`
	SystemPrompt string `json:"system_prompt,omitempty"`
}

type configRequest struct {
	Engine       string  `json:"engine,omitempty"`
	Voice        string  `json:"voice,omitempty"`
	Pitch        string  `json:"pitch,omitempty"`
	Speed        float64 `json:"speed,omitempty"`
	SystemPrompt string  `json:"system_prompt,omitempty"`
	GeminiAPI    string  `json:"gemini_api,omitempty"`
	GroqAPI      string  `json:"groq_api,omitempty"`
	GrokAPI      string  `json:"grok_api,omitempty"`
	AgentURL     string  `json:"agent_url,omitempty"` // gateway 9router (owner 26 Sep)
	AgentKey     string  `json:"agent_key,omitempty"`
	AgentModel   string  `json:"agent_model,omitempty"`
	AIProvider   string  `json:"ai_provider,omitempty"`
}

func checkAuth(r *http.Request) bool {
	key := strings.TrimSpace(os.Getenv("AICALL_HTTP_KEY"))
	if key == "" {
		return true
	}
	h := strings.TrimSpace(r.Header.Get("X-Api-Key"))
	if h == "" {
		h = strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	}
	return h == key
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]interface{}{"ok": false, "error": msg})
}

func normalizeNumber(raw string) string {
	n := strings.TrimSpace(raw)
	n = strings.TrimPrefix(n, "+")
	n = strings.ReplaceAll(n, "-", "")
	n = strings.ReplaceAll(n, " ", "")
	return n
}

// startOutgoingCall — pasang panggilan AI ke nomor tujuan (dipakai HTTP + chat)
func startOutgoingCall(targetNum string) error {
	if callerRef == nil {
		return fmt.Errorf("caller client belum siap")
	}
	if waClientRef == nil || !waClientRef.IsConnected() {
		return fmt.Errorf("sesi WhatsApp AI Call belum terhubung")
	}
	targetJID := types.NewJID(targetNum, types.DefaultUserServer)
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	log.Printf("[HTTP] Dialing %s for AI call...", targetJID.String())
	call, err := callerRef.Call(ctx, targetJID.String())
	if err != nil {
		return err
	}
	session := NewAICallSession(call)
	call.OnEnd(func(reason string) {
		log.Printf("[HTTP] Call with %s ended: %s", targetJID.String(), reason)
		session.Stop()
	})
	call.OnReady(func() {
		log.Printf("[HTTP] Call connected with %s! Starting AI voice loop...", targetJID.String())
		go session.StartVoiceLoop()
	})
	return nil
}

func startHTTPAPI() {
	port := strings.TrimSpace(os.Getenv("AICALL_HTTP_PORT"))
	if port == "" {
		port = "8788"
	}
	mux := http.NewServeMux()

	// GET /health — dipakai .aicall status
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		if !checkAuth(r) {
			writeErr(w, 401, "unauthorized")
			return
		}
		connected := waClientRef != nil && waClientRef.IsConnected()
		writeJSON(w, 200, map[string]interface{}{
			"ok":              true,
			"connected":       connected,
			"uptime":          time.Since(botStartTime).Truncate(time.Second).String(),
			"provider":        AppConfig.AIProvider,
			"grok_model":      AppConfig.GrokModel,
			"groq_chat_model": AppConfig.GroqChatModel,
			"agent_model":     AppConfig.AgentModel,
			"model":           AppConfig.GeminiModel,
			"engine":          AppConfig.TTSEngine,
			"voice":           AppConfig.TTSVoice,
			"owners":          len(AppConfig.Owners),
			"commands":        commandsOn,
		})
	})

	// POST /call — pasang panggilan AI ke nomor
	mux.HandleFunc("POST /call", func(w http.ResponseWriter, r *http.Request) {
		if !checkAuth(r) {
			writeErr(w, 401, "unauthorized")
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			writeErr(w, 400, "body gak kebaca")
			return
		}
		var req callRequest
		if err := json.Unmarshal(body, &req); err != nil {
			writeErr(w, 400, "JSON tidak valid")
			return
		}
		targetNum := normalizeNumber(req.Number)
		if len(targetNum) < 8 {
			writeErr(w, 400, "nomor tidak valid")
			return
		}
		// override key dari pusat apikeys.json bot utama (opsional)
		aicallMu.Lock()
		if strings.TrimSpace(req.GeminiAPI) != "" {
			AppConfig.GeminiAPI = strings.TrimSpace(req.GeminiAPI)
		}
		if strings.TrimSpace(req.GroqAPI) != "" {
			AppConfig.GroqAPI = strings.TrimSpace(req.GroqAPI)
		}
		if strings.TrimSpace(req.GrokAPI) != "" {
			AppConfig.GrokAPI = strings.TrimSpace(req.GrokAPI)
		}
		if strings.TrimSpace(req.AgentURL) != "" {
			AppConfig.AgentURL = strings.TrimSpace(req.AgentURL)
		}
		if strings.TrimSpace(req.AgentKey) != "" {
			AppConfig.AgentKey = strings.TrimSpace(req.AgentKey)
		}
		if strings.TrimSpace(req.AgentModel) != "" {
			AppConfig.AgentModel = strings.TrimSpace(req.AgentModel)
		}
		if strings.TrimSpace(req.AIProvider) != "" {
			p := strings.ToLower(strings.TrimSpace(req.AIProvider))
			if p == "grok" || p == "agent" || p == "groq" || p == "gemini" {
				AppConfig.AIProvider = p
			}
		}
		if strings.TrimSpace(req.SystemPrompt) != "" {
			AppConfig.SystemPrompt = strings.TrimSpace(req.SystemPrompt)
		}
		aicallMu.Unlock()
		if err := startOutgoingCall(targetNum); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		writeJSON(w, 200, map[string]interface{}{"ok": true, "number": targetNum})
	})

	// POST /config — ganti engine/voice/pitch/speed/prompt live
	mux.HandleFunc("POST /config", func(w http.ResponseWriter, r *http.Request) {
		if !checkAuth(r) {
			writeErr(w, 401, "unauthorized")
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			writeErr(w, 400, "body gak kebaca")
			return
		}
		var req configRequest
		if err := json.Unmarshal(body, &req); err != nil {
			writeErr(w, 400, "JSON tidak valid")
			return
		}
		aicallMu.Lock()
		if strings.TrimSpace(req.Engine) != "" {
			e := strings.ToLower(strings.TrimSpace(req.Engine))
			switch e {
			case "edgetts", "geminitts", "elevenlabs", "openai", "animetts", "google":
				AppConfig.TTSEngine = e
			default:
				aicallMu.Unlock()
				writeErr(w, 400, "engine tidak valid (edgetts/geminitts/elevenlabs/openai/animetts/google)")
				return
			}
		}
		if strings.TrimSpace(req.Voice) != "" {
			AppConfig.TTSVoice = strings.TrimSpace(req.Voice)
		}
		if strings.TrimSpace(req.Pitch) != "" {
			AppConfig.TTSPitch = strings.TrimSpace(req.Pitch)
		}
		if req.Speed > 0 {
			AppConfig.TTSSpeed = req.Speed
		}
		if strings.TrimSpace(req.SystemPrompt) != "" {
			AppConfig.SystemPrompt = strings.TrimSpace(req.SystemPrompt)
		}
		if strings.TrimSpace(req.GeminiAPI) != "" {
			AppConfig.GeminiAPI = strings.TrimSpace(req.GeminiAPI)
		}
		if strings.TrimSpace(req.GroqAPI) != "" {
			AppConfig.GroqAPI = strings.TrimSpace(req.GroqAPI)
		}
		if strings.TrimSpace(req.GrokAPI) != "" {
			AppConfig.GrokAPI = strings.TrimSpace(req.GrokAPI)
		}
		if strings.TrimSpace(req.AgentURL) != "" {
			AppConfig.AgentURL = strings.TrimSpace(req.AgentURL)
		}
		if strings.TrimSpace(req.AgentKey) != "" {
			AppConfig.AgentKey = strings.TrimSpace(req.AgentKey)
		}
		if strings.TrimSpace(req.AgentModel) != "" {
			AppConfig.AgentModel = strings.TrimSpace(req.AgentModel)
		}
		if strings.TrimSpace(req.AIProvider) != "" {
			p := strings.ToLower(strings.TrimSpace(req.AIProvider))
			if p == "grok" || p == "agent" || p == "groq" || p == "gemini" {
				AppConfig.AIProvider = p
			} else {
				aicallMu.Unlock()
				writeErr(w, 400, "provider tidak valid (grok/agent/groq/gemini)")
				return
			}
		}
		engine := AppConfig.TTSEngine
		voice := AppConfig.TTSVoice
		aicallMu.Unlock()
		writeJSON(w, 200, map[string]interface{}{"ok": true, "engine": engine, "voice": voice})
	})

	srv := &http.Server{
		Addr:              "127.0.0.1:" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		log.Printf("[HTTP] AI Call API jalan di 127.0.0.1:%s (key: %t)", port, strings.TrimSpace(os.Getenv("AICALL_HTTP_KEY")) != "")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("[HTTP] API mati: %v", err)
		}
	}()
}
