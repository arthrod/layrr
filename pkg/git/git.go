package git

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

// Commit represents a git commit
type Commit struct {
	Hash      string    `json:"hash"`
	Message   string    `json:"message"`
	Author    string    `json:"author"`
	Date      time.Time `json:"date"`
	ShortHash string    `json:"shortHash"`
}

// GitManager handles git operations
type GitManager struct {
	projectDir string
}

// NewGitManager creates a new GitManager
func NewGitManager(projectDir string) *GitManager {
	return &GitManager{projectDir: projectDir}
}

// CreateCommit stages all changes and creates a commit with custom author
func (g *GitManager) CreateCommit(message string) error {
	// Stage all changes
	if err := g.runGitCommand("add", "."); err != nil {
		return fmt.Errorf("failed to stage changes: %w", err)
	}

	// Create commit with custom author
	if err := g.runGitCommandWithEnv(
		[]string{
			"GIT_AUTHOR_NAME=Layrr",
			"GIT_AUTHOR_EMAIL=hitman@layrr.dev",
			"GIT_COMMITTER_NAME=Layrr",
			"GIT_COMMITTER_EMAIL=hitman@layrr.dev",
		},
		"commit", "-m", message,
	); err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	return nil
}

// GetCommitHistory retrieves list of commits
func (g *GitManager) GetCommitHistory(limit int) ([]Commit, error) {
	// Format: hash|short|author|date|message
	args := []string{
		"log",
		fmt.Sprintf("-%d", limit),
		"--pretty=format:%H|%h|%an|%aI|%s",
	}

	output, err := g.runGitCommandWithOutput(args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit history: %w", err)
	}

	// Parse output
	commits := []Commit{}
	lines := strings.Split(strings.TrimSpace(output), "\n")

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, "|", 5)
		if len(parts) != 5 {
			continue
		}

		date, _ := time.Parse(time.RFC3339, parts[3])

		commits = append(commits, Commit{
			Hash:      parts[0],
			ShortHash: parts[1],
			Author:    parts[2],
			Date:      date,
			Message:   parts[4],
		})
	}

	return commits, nil
}

// CheckoutCommit checks out a specific commit
func (g *GitManager) CheckoutCommit(commitHash string) error {
	return g.runGitCommand("checkout", commitHash)
}

// GetCurrentBranch returns the current branch or HEAD state
func (g *GitManager) GetCurrentBranch() (string, error) {
	output, err := g.runGitCommandWithOutput("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(output), nil
}

// IsGitRepo checks if directory is a git repository
func (g *GitManager) IsGitRepo() bool {
	err := g.runGitCommand("rev-parse", "--git-dir")
	return err == nil
}

// runGitCommand executes a git command
func (g *GitManager) runGitCommand(args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = g.projectDir
	return cmd.Run()
}

// runGitCommandWithOutput executes git and returns output
func (g *GitManager) runGitCommandWithOutput(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = g.projectDir

	var out bytes.Buffer
	cmd.Stdout = &out

	if err := cmd.Run(); err != nil {
		return "", err
	}

	return out.String(), nil
}

// runGitCommandWithEnv runs git with custom environment variables
func (g *GitManager) runGitCommandWithEnv(envVars []string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = g.projectDir
	cmd.Env = append(os.Environ(), envVars...)
	return cmd.Run()
}
