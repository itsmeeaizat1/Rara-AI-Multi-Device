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
// Provider: "grok" (xAI, request owner 17 Sep 2026 "pakai apikey grok dlu")
// atau "gemini". Grok gagal → otomatis fallback Gemini kalau key-nya ada.
func (c *Conversation) Chat(userPrompt string) (string, error) {
	c.History = append(c.History, GeminiContent{
		Role:  "user",
		Parts: []GeminiPart{{Text: userPrompt}},
	})

	provider := strings.ToLower(strings.TrimSpace(AppConfig.AIProvider))
	if provider == "grok" && AppConfig.GrokAPI != "" {
		reply, err := c.chatGrok()
		if err == nil {
			c.appendAssistant(reply)
			return reply, nil
		}
		// fallback ke Gemini kalau key-nya ada (pola rantai bot utama)
		if AppConfig.GeminiAPI != "" {
			fmt.Printf("[AI] Grok gagal (%v) — fallback ke Gemini\n", err)
			reply2, err2 := c.chatGemini()
			if err2 == nil {
				c.appendAssistant(reply2)
				return reply2, nil
			}
			return "", err2
		}
		return "", err
	}

	return c.chatGemini()
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
	apiKey := AppConfig.GrokAPI
	if apiKey == "" {
		return "", fmt.Errorf("XAI_API (Grok) key is not configured")
	}

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
	// buang duplikat system prompt bila histori panget (jaga token)
	if len(msgs) > 24 {
		msgs = append(msgs[:1], msgs[len(msgs)-20:]...)
	}

	primaryModel := AppConfig.GrokModel
	if primaryModel == "" {
		primaryModel = "grok-3-mini"
	}
	modelsToTry := []string{primaryModel}
	if primaryModel != "grok-3-mini" {
		modelsToTry = append(modelsToTry, "grok-3-mini")
	}

	client := &http.Client{Timeout: 30 * time.Second}
	var lastErr error
	for _, modelName := range modelsToTry {
		reqBody := OpenAIChatRequest{
			Model:       modelName,
			Messages:    msgs,
			Temperature: 0.7,
			MaxTokens:   100,
		}
		jsonBytes, err := json.Marshal(reqBody)
		if err != nil {
			return "", fmt.Errorf("failed to marshal grok request: %w", err)
		}
		req, err := http.NewRequest("POST", "https://api.x.ai/v1/chat/completions", bytes.NewBuffer(jsonBytes))
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
			lastErr = fmt.Errorf("grok API (%s) returned status %d: %s", modelName, resp.StatusCode, string(b))
			continue
		}
		var chatResp OpenAIChatResponse
		if err := json.Unmarshal(b, &chatResp); err != nil {
			return "", fmt.Errorf("failed to unmarshal grok response: %w", err)
		}
		if chatResp.Error != nil && chatResp.Error.Message != "" {
			return "", fmt.Errorf("grok API error: %s", chatResp.Error.Message)
		}
		if len(chatResp.Choices) == 0 {
			return "", fmt.Errorf("empty response from Grok")
		}
		return chatResp.Choices[0].Message.Content, nil
	}
	if lastErr != nil {
		return "", lastErr
	}
	return "", fmt.Errorf("grok API unknown failure")
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
