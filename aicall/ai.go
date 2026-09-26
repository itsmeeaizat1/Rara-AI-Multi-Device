package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiContent struct {
	Role  string       `json:"role"` // "user" or "model"
	Parts []GeminiPart `json:"parts"`
}

type GeminiSystemInstruction struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiRequest struct {
	Contents          []GeminiContent          `json:"contents"`
	SystemInstruction *GeminiSystemInstruction `json:"systemInstruction,omitempty"`
	GenerationConfig  map[string]interface{}   `json:"generationConfig,omitempty"`
}

type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
	Error      *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type Conversation struct {
	History []GeminiContent
}

func NewConversation() *Conversation {
	return &Conversation{
		History: make([]GeminiContent, 0),
	}
}

// Chat sends prompt to AI model (provider aktif) and returns response text.
// Provider: "grok" (xAI), "groq" (Groq — key pemilik 17 Sep 2026, model
// gpt-oss-20b), atau "gemini". Provider aktif gagal → otomatis geser ke
// provider lain yang punya key (pola rantai bot utama: grok → groq → gemini).
func (c *Conversation) Chat(userPrompt string) (string, error) {
	c.History = append(c.History, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: userPrompt}},
	})

	// urutan coba: provider aktif duluan, sisanya sebagai fallback
	order := []string{}
	provider := strings.ToLower(strings.TrimSpace(AppConfig.AIProvider))
	if provider == "" {
		provider = "groq"
	}
	order = append(order, provider)
	// owner 26 Sep 2026: key Grok mahal/gak dipasang → fallback ke "agent"
	// (gateway 9router — otak AI agent bot utama) SEBELUM groq/gemini.
	for _, p := range []string{"grok", "agent", "groq", "gemini"} {
		if p != provider {
			order = append(order, p)
		}
	}

	var lastErr error
	for _, p := range order {
		var reply string
		var err error
		switch p {
		case "grok":
			if AppConfig.GrokAPI == "" {
				continue
			}
			reply, err = c.chatGrok()
		case "agent":
			if AppConfig.AgentURL == "" {
				continue
			}
			reply, err = c.chatAgent()
		case "groq":
			if AppConfig.GroqAPI == "" {
				continue
			}
			reply, err = c.chatGroq()
		default: // gemini
			if AppConfig.GeminiAPI == "" {
				continue
			}
			reply, err = c.chatGemini()
		}
		if err == nil {
			if p != provider {
				fmt.Printf("[AI] provider %s gagal (%v) — sukses via %s\n", provider, lastErr, p)
			}
			c.appendAssistant(reply)
			return reply, nil
		}
		lastErr = err
		fmt.Printf("[AI] provider %s gagal: %v\n", p, err)
	}
	if lastErr != nil {
		return "", lastErr
	}
	return "", fmt.Errorf("tidak ada provider AI yang punya key")
}

// appendAssistant catat jawaban AI ke histori percakapan
func (c *Conversation) appendAssistant(reply string) {
	c.History = append(c.History, GeminiContent{
		Role:  "model",
		Parts: []GeminiPart{{Text: reply}},
	})
}

// ─────────── GROK (xAI — OpenAI-compatible) ───────────

type OpenAIMessage struct {
	Role    string `json:"role"` // "system" | "user" | "assistant"
	Content string `json:"content"`
}

type OpenAIChatRequest struct {
	Model       string          `json:"model"`
	Messages    []OpenAIMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens"`
}

type OpenAIChatChoice struct {
	Message OpenAIMessage `json:"message"`
}

type OpenAIChatResponse struct {
	Choices []OpenAIChatChoice `json:"choices"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// chatGrok — percakapan via api.x.ai (format OpenAI chat completions)
func (c *Conversation) chatGrok() (string, error) {
	if AppConfig.GrokAPI == "" {
		return "", fmt.Errorf("XAI_API (Grok) key is not configured")
	}
	primaryModel := AppConfig.GrokModel
	if primaryModel == "" {
		primaryModel = "grok-3-mini"
	}
	models := []string{primaryModel}
	if primaryModel != "grok-3-mini" {
		models = append(models, "grok-3-mini")
	}
	return c.chatOpenAICompat("https://api.x.ai/v1/chat/completions", AppConfig.GrokAPI, models, "grok")
}

// chatGroq — percakapan via api.groq.com (format OpenAI; key SAMA dengan STT
// whisper — Groq gpt-oss-20b super cepat buat panggilan suara)
func (c *Conversation) chatGroq() (string, error) {
	if AppConfig.GroqAPI == "" {
		return "", fmt.Errorf("GROQ_API key is not configured")
	}
	primaryModel := AppConfig.GroqChatModel
	if primaryModel == "" {
		primaryModel = "openai/gpt-oss-20b"
	}
	models := []string{primaryModel}
	if primaryModel != "openai/gpt-oss-20b" {
		models = append(models, "openai/gpt-oss-20b")
	}
	models = append(models, "qwen/qwen3.8-27b")
	return c.chatOpenAICompat("https://api.groq.com/openai/v1/chat/completions", AppConfig.GroqAPI, models, "groq")
}

// chatAgent — percakapan via gateway 9router (OpenAI-compatible) = otak
// AI agent bot utama. Request owner 26 Sep 2026: "kalau apikey Grok gak
// dipasang (mahal), fallback ngandelin ke ai biasa, tembak ke ai agent".
// Key & endpoint dikirim per-request dari pusat apikeys.json bot utama
// (tioApiKey) — .env cuma fallback.
func (c *Conversation) chatAgent() (string, error) {
	if AppConfig.AgentURL == "" {
		return "", fmt.Errorf("ROUTER9_API_URL (gateway 9router) belum dikonfigurasi")
	}
	primaryModel := AppConfig.AgentModel
	if primaryModel == "" {
		primaryModel = "ag/gemini-pro-agent"
	}
	models := []string{primaryModel}
	if primaryModel != "ag/gemini-3-flash" {
		models = append(models, "ag/gemini-3-flash")
	}
	return c.chatOpenAICompat(AppConfig.AgentURL, AppConfig.AgentKey, models, "agent")
}

// chatOpenAICompat — generic OpenAI chat completions (dipakai grok & groq)
func (c *Conversation) chatOpenAICompat(url, apiKey string, models []string, label string) (string, error) {
	sysPrompt := AppConfig.SystemPrompt
	if sysPrompt == "" {
		sysPrompt = DefaultSystemPrompt
	}

	msgs := []OpenAIMessage{{Role: "system", Content: sysPrompt}}
	for _, h := range c.History {
		role := "assistant"
		if h.Role == "user" {
			role = "user"
		}
		if len(h.Parts) > 0 {
			msgs = append(msgs, OpenAIMessage{Role: role, Content: h.Parts[0].Text})
		}
	}
	// buang histori lama bila kepanjangan (jaga token + latensi)
	if len(msgs) > 24 {
		msgs = append(msgs[:1], msgs[len(msgs)-20:]...)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	var lastErr error
	for _, modelName := range models {
		reqBody := OpenAIChatRequest{
			Model:       modelName,
			Messages:    msgs,
			Temperature: 0.7,
			MaxTokens:   100,
		}
		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			return "", fmt.Errorf("failed to marshal %s request: %w", label, err)
		}
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		b, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("%s API (%s) returned status %d: %s", label, modelName, resp.StatusCode, string(b))
			continue
		}
		var chatResp OpenAIChatResponse
		if err := json.Unmarshal(b, &chatResp); err != nil {
			return "", fmt.Errorf("failed to unmarshal %s response: %w", label, err)
		}
		if chatResp.Error != nil && chatResp.Error.Message != "" {
			return "", fmt.Errorf("%s API error: %s", label, chatResp.Error.Message)
		}
		if len(chatResp.Choices) == 0 {
			return "", fmt.Errorf("empty response from %s", label)
		}
		return chatResp.Choices[0].Message.Content, nil
	}
	if lastErr != nil {
		return "", lastErr
	}
	return "", fmt.Errorf("%s API unknown failure", label)
}

// ─────────── GEMINI (jalur asli) ───────────

func (c *Conversation) chatGemini() (string, error) {
	apiKey := AppConfig.GeminiAPI
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API key is not configured")
	}

	sysPrompt := AppConfig.SystemPrompt
	if sysPrompt == "" {
		sysPrompt = DefaultSystemPrompt
	}

	reqBody := GeminiRequest{
		Contents: c.History,
		SystemInstruction: &GeminiSystemInstruction{
			Parts: []GeminiPart{{Text: sysPrompt}},
		},
		GenerationConfig: map[string]interface{}{
			"temperature":     0.7,
			"maxOutputTokens": 100,
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal gemini request: %w", err)
	}

	primaryModel := AppConfig.GeminiModel
	if primaryModel == "" {
		primaryModel = "gemini-3.1-flash-lite"
	}

	fallbackModels := []string{primaryModel, "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"}
	// Deduplicate
	modelsToTry := make([]string, 0, len(fallbackModels))
	seen := make(map[string]bool)
	for _, m := range fallbackModels {
		if !seen[m] {
			seen[m] = true
			modelsToTry = append(modelsToTry, m)
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	var lastErr error
	var respBytes []byte

	for _, modelName := range modelsToTry {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		b, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusOK {
			respBytes = b
			lastErr = nil
			break
		}

		lastErr = fmt.Errorf("gemini API (%s) returned status %d: %s", modelName, resp.StatusCode, string(b))
	}

	if lastErr != nil {
		return "", lastErr
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal gemini response: %w", err)
	}

	if geminiResp.Error != nil && geminiResp.Error.Message != "" {
		return "", fmt.Errorf("gemini API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response candidate from Gemini")
	}

	reply := geminiResp.Candidates[0].Content.Parts[0].Text
	c.appendAssistant(reply)
	return reply, nil
}
