package bridge

import (
	"fmt"
	"strings"

	"github.com/thetronjohnson/layrr/pkg/claude"
	"github.com/thetronjohnson/layrr/pkg/status"
)

// ElementInfo represents information about a selected HTML element
type ElementInfo struct {
	TagName    string `json:"tagName"`
	ID         string `json:"id"`
	Classes    string `json:"classes"`
	Selector   string `json:"selector"`
	InnerText  string `json:"innerText"`
	OuterHTML  string `json:"outerHTML"`
}

// AreaInfo represents information about a selected area containing multiple elements
type AreaInfo struct {
	X            int           `json:"x"`
	Y            int           `json:"y"`
	Width        int           `json:"width"`
	Height       int           `json:"height"`
	ElementCount int           `json:"elementCount"`
	Elements     []ElementInfo `json:"elements"`
}

// Message represents a message from the browser to Claude Code
type Message struct {
	ID          int      `json:"id"`
	Area        AreaInfo `json:"area"`
	Instruction string   `json:"instruction"`
	Screenshot  string   `json:"screenshot"` // Base64 encoded image
}

// Bridge coordinates messages between the browser and Claude Code
type Bridge struct {
	claudeManager *claude.Manager
	verbose       bool
	display       *status.Display
}

// NewBridge creates a new bridge
func NewBridge(claudeManager *claude.Manager, verbose bool, display *status.Display) *Bridge {
	return &Bridge{
		claudeManager: claudeManager,
		verbose:       verbose,
		display:       display,
	}
}

// HandleMessage processes a message from the browser and sends it to Claude Code
func (b *Bridge) HandleMessage(msg Message) error {
	fmt.Printf("[Bridge] 🌉 === HANDLING MESSAGE ===\n")
	fmt.Printf("[Bridge] Message ID: %d\n", msg.ID)
	fmt.Printf("[Bridge] Instruction: %s\n", msg.Instruction)

	// Format the message for Claude Code
	fmt.Printf("[Bridge] 📝 Formatting message for Claude Code...\n")
	formattedMsg := b.formatMessage(msg)
	fmt.Printf("[Bridge] ✅ Formatted message: %s\n", formattedMsg)

	// Log the instruction details
	areaInfo := fmt.Sprintf("%dx%d px · %d elements",
		msg.Area.Width, msg.Area.Height, msg.Area.ElementCount)
	fmt.Printf("[Bridge] 📊 Area info: %s\n", areaInfo)
	fmt.Printf("[Bridge] 💬 Instruction: %s\n", msg.Instruction)

	// Send to Claude Code (this blocks until Claude finishes)
	fmt.Printf("[Bridge] 🚀 Calling Claude Manager...\n")

	err := b.claudeManager.SendMessage(formattedMsg)

	if err != nil {
		fmt.Printf("[Bridge] ❌ Claude Manager error: %v\n", err)
		return fmt.Errorf("failed to send message to Claude Code: %w", err)
	}
	fmt.Printf("[Bridge] ✅ Claude Manager completed successfully\n")

	return nil
}

// formatMessage formats a browser message for Claude Code
func (b *Bridge) formatMessage(msg Message) string {
	// Format message for Claude Code CLI
	// Single-line format keeps the message compact and readable

	var parts []string

	// Start with the instruction
	parts = append(parts, msg.Instruction)

	// Add area context inline
	parts = append(parts, fmt.Sprintf("(Selected %d elements in %dx%d area:",
		msg.Area.ElementCount, msg.Area.Width, msg.Area.Height))

	// Include ALL elements with full details (not just first 3)
	for i, el := range msg.Area.Elements {
		// Build element descriptor with full information
		var elementDesc strings.Builder
		elementDesc.WriteString("[")

		// Selector (e.g., "div#card-1.card.featured")
		elementDesc.WriteString(el.Selector)

		// Inner text (first 50 chars to keep message manageable)
		if el.InnerText != "" {
			innerText := strings.ReplaceAll(el.InnerText, "\n", " ")
			innerText = strings.TrimSpace(innerText)
			if len(innerText) > 50 {
				innerText = innerText[:50] + "..."
			}
			elementDesc.WriteString(fmt.Sprintf(" text:\"%s\"", innerText))
		}

		// Compact HTML (first 100 chars)
		if el.OuterHTML != "" {
			html := strings.ReplaceAll(el.OuterHTML, "\n", " ")
			html = strings.TrimSpace(html)
			if len(html) > 100 {
				html = html[:100] + "..."
			}
			elementDesc.WriteString(fmt.Sprintf(" html:%s", html))
		}

		elementDesc.WriteString("]")

		parts = append(parts, elementDesc.String())

		// Limit total elements to 20 to keep message size reasonable
		if i >= 19 && len(msg.Area.Elements) > 20 {
			parts = append(parts, fmt.Sprintf("[+%d more elements]", len(msg.Area.Elements)-20))
			break
		}
	}

	parts = append(parts, ")")

	// Join all parts with spaces - single line, no newlines
	return strings.Join(parts, " ")
}
