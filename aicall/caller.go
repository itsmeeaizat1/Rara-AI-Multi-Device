package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/purpshell/meowcaller"
)

type AICallSession struct {
	Call         *meowcaller.Call
	Conversation *Conversation
	IsActive     bool
	mu           sync.Mutex
	stopChan     chan struct{}
}

func NewAICallSession(call *meowcaller.Call) *AICallSession {
	return &AICallSession{
		Call:         call,
		Conversation: NewConversation(),
		IsActive:     true,
		stopChan:     make(chan struct{}),
	}
}

func (s *AICallSession) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.IsActive {
		s.IsActive = false
		close(s.stopChan)
	}
}

// tryVoiceCommand — kirim transkrip ke voice-command bridge bot utama
// (nova-aicall-bridge.js, POST /voice). Balikin teks yang harus DIUCAPKAN di
// telepon, atau "" kalau bukan perintah / bridge gak sempat jawab (timeout
// pendek biar percakapan gak nyendat).
func (s *AICallSession) tryVoiceCommand(text string) string {
	baseURL := strings.TrimSpace(os.Getenv("AICALL_BRIDGE_URL"))
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8790"
	}
	body, err := json.Marshal(map[string]string{
		"text":   text,
		"number": s.Call.Peer().String(),
	})
	if err != nil {
		return ""
	}
	req, err := http.NewRequest("POST", baseURL+"/voice", bytes.NewReader(body))
	if err != nil {
		return ""
	}
	req.Header.Set("Content-Type", "application/json")
	if key := strings.TrimSpace(os.Getenv("AICALL_HTTP_KEY")); key != "" {
		req.Header.Set("X-Api-Key", key)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "" // bridge gak ada / bot mati → ngobrol aja normal
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return ""
	}
	var r struct {
		Type string `json:"type"`
		Text string `json:"text"`
		Cmd  string `json:"cmd"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&r); err != nil {
		return ""
	}
	if r.Type == "command" && strings.TrimSpace(r.Text) != "" {
		return r.Text
	}
	return ""
}

// callerACLViaBridge — tanya bot utama level akses pemanggil: owner /
// premium / none (owner 26 Sep: "user bsa akses aicall tp hrs premium dlu
// biar g dispam"). Bridge gak ada / bot mati → fallback IsOwner: owner
// tetap bisa telepon, selain itu ditolak (safe default, bukan kebalik).
func callerACLViaBridge(peer string) string {
	if IsOwner(peer) {
		return "owner"
	}
	baseURL := strings.TrimSpace(os.Getenv("AICALL_BRIDGE_URL"))
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8790"
	}
	body, err := json.Marshal(map[string]string{"number": peer})
	if err != nil {
		return "none"
	}
	req, err := http.NewRequest("POST", baseURL+"/acl", bytes.NewReader(body))
	if err != nil {
		return "none"
	}
	req.Header.Set("Content-Type", "application/json")
	if key := strings.TrimSpace(os.Getenv("AICALL_HTTP_KEY")); key != "" {
		req.Header.Set("X-Api-Key", key)
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "none" // bridge gak ada → cuma owner yang lolos (di atas)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "none"
	}
	var r struct {
		Level string `json:"level"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&r); err != nil {
		return "none"
	}
	switch r.Level {
	case "owner", "premium":
		return r.Level
	}
	return "none"
}

// StartVoiceLoop manages the active AI conversation during a WhatsApp call
func (s *AICallSession) StartVoiceLoop() {
	log.Printf("[AI Call] Voice loop started for call ID: %s (Peer: %s)", s.Call.ID(), s.Call.Peer().String())

	// 1. Play initial welcome greeting
	initialGreeting := "Halo! Saya adalah AI Asisten. Silakan bicara, saya mendengarkan."
	s.speakText(initialGreeting)

	// 2. Main interactive conversation loop
	round := 0
	for {
		select {
		case <-s.stopChan:
			log.Printf("[AI Call] Voice loop stopped for call ID: %s", s.Call.ID())
			return
		default:
		}

		if !s.IsActive || s.Call.State() != meowcaller.CallPhaseActive {
			log.Printf("[AI Call] Call ended or inactive. Stopping voice loop.")
			return
		}

		round++
		recFile := filepath.Join(".", "temp", fmt.Sprintf("rec_%s_%d.wav", s.Call.ID(), round))

		log.Printf("[AI Call] [Round %d] Listening to user speech...", round)

		// Record 6 seconds of user audio
		err := s.recordUserAudio(recFile, 6*time.Second)
		if err != nil {
			log.Printf("[AI Call] Audio recording error: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		fi, err := os.Stat(recFile)
		if err != nil || fi.Size() < 4000 {
			_ = os.Remove(recFile)
			continue
		}

		log.Printf("[AI Call] Transcribing audio with Groq STT (whisper-large-v3)...")
		transcription, err := TranscribeAudio(recFile)
		_ = os.Remove(recFile)

		if err != nil {
			log.Printf("[AI Call] STT Error: %v", err)
			continue
		}

		transcription = strings.TrimSpace(transcription)
		if len(transcription) == 0 {
			log.Printf("[AI Call] No speech detected in audio.")
			continue
		}

		log.Printf("[AI Call] User Said: %q", transcription)

		// 🔹 VOICE COMMAND BRIDGE (owner 26 Sep 2026: "lg telepon ai call
		// 'halo tolong matikan bot' otomatis respon ke cmd bot off atau
		// fitur lain") — transkrip dikirim ke bot utama dulu; kalau cocok
		// perintah suara, bot jalanin command dan kita NYUARAIN konfirmasi.
		// Gak cocok / bridge gak ada → lanjut percakapan AI normal.
		if spoken := s.tryVoiceCommand(transcription); spoken != "" {
			log.Printf("[AI Call] Voice command dijalankan — diucapkan: %q", spoken)
			s.speakText(spoken)
			continue
		}

		log.Printf("[AI Call] Generating AI response with Gemini (%s)...", AppConfig.GeminiModel)
		aiReply, err := s.Conversation.Chat(transcription)
		if err != nil {
			log.Printf("[AI Call] Gemini AI Error: %v", err)
			s.speakText("Maaf, terjadi masalah saat memproses respon AI.")
			continue
		}

		log.Printf("[AI Call] AI Reply: %q", aiReply)

		s.speakText(aiReply)
	}
}

func (s *AICallSession) recordUserAudio(outputPath string, duration time.Duration) error {
	recorder, err := meowcaller.WAVRecorder(outputPath)
	if err != nil {
		return err
	}

	s.Call.Receive(recorder)

	timer := time.NewTimer(duration)
	defer timer.Stop()

	select {
	case <-timer.C:
	case <-s.stopChan:
	}

	s.Call.Receive(nil)
	return recorder.Close()
}

func (s *AICallSession) speakText(text string) {
	if text == "" {
		return
	}

	log.Printf("[AI Call] Generating TTS audio for text: %q", text)
	audioFile, err := GenerateTTS(text)
	if err != nil {
		log.Printf("[AI Call] TTS Error: %v", err)
		return
	}
	defer func() {
		time.AfterFunc(2*time.Second, func() {
			_ = os.Remove(audioFile)
		})
	}()

	var src meowcaller.AudioSource
	if filepath.Ext(audioFile) == ".wav" {
		src, err = meowcaller.WAVFile(audioFile)
	} else {
		src, err = meowcaller.MP3File(audioFile)
	}

	if err != nil {
		log.Printf("[AI Call] Failed to open audio source file (%s): %v", audioFile, err)
		return
	}
	defer src.Close()

	doneChan := make(chan struct{})
	player := meowcaller.NewPlayer()
	player.OnFinish(func() {
		close(doneChan)
	})

	s.Call.Subscribe(player)
	player.Play(src)

	select {
	case <-doneChan:
		log.Printf("[AI Call] Finished playing TTS audio.")
	case <-time.After(30 * time.Second):
		log.Printf("[AI Call] Audio playback timeout.")
		player.Stop()
	case <-s.stopChan:
		player.Stop()
	}
}
