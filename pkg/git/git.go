package git

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

type Commit struct {
	Hash      string    `json:"hash"`
	Message   string    `json:"message"`
	Author    string    `json:"author"`
	Date      time.Time `json:"date"`
	ShortHash string    `json:"shortHash"`
}

type GitManager struct {
	projectDir string
}

func NewGitManager(projectDir string) *GitManager {
	return &GitManager{projectDir: projectDir}
}

func (g *GitManager) CreateCommit(message string) error {
	// Ensure we're on main branch
	if err := g.ensureMainBranch(); err != nil {
		return fmt.Errorf("failed to ensure main branch: %w", err)
	}

	// Stage all changes
	if err := g.runGitCommand("add", "."); err != nil {
		return fmt.Errorf("failed to stage changes: %w", err)
	}

	// Create commit with custom author using environment variables
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

func (g *GitManager) GetCommitHistory(limit int) ([]Commit, error) {
	// Format: hash|short|author|date|message
	// Use --all to show all commits, not just ancestors of current HEAD
	// Use --date-order to sort by commit date
	args := []string{
		"log",
		"--all",
		"--date-order",
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

func (g *GitManager) CheckoutCommit(commitHash string) error {
	// Ensure we're on main branch first
	if err := g.ensureMainBranch(); err != nil {
		return fmt.Errorf("failed to ensure main branch: %w", err)
	}

	// Use reset --hard to move to a commit while staying on main branch
	// This allows viewing all commits in history, not just ancestors
	return g.runGitCommand("reset", "--hard", commitHash)
}

func (g *GitManager) IsGitRepo() bool {
	err := g.runGitCommand("rev-parse", "--git-dir")
	return err == nil
}

func (g *GitManager) runGitCommand(args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = g.projectDir
	return cmd.Run()
}

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

func (g *GitManager) runGitCommandWithEnv(envVars []string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = g.projectDir
	cmd.Env = append(os.Environ(), envVars...)
	return cmd.Run()
}

func (g *GitManager) ensureMainBranch() error {
	// Get current branch name
	currentBranch, err := g.runGitCommandWithOutput("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return fmt.Errorf("failed to get current branch: %w", err)
	}
	currentBranch = strings.TrimSpace(currentBranch)

	// If already on main, we're good
	if currentBranch == "main" {
		return nil
	}

	// Check if main branch exists
	err = g.runGitCommand("rev-parse", "--verify", "main")
	if err != nil {
		// Main branch doesn't exist, create it from current HEAD
		if err := g.runGitCommand("branch", "main"); err != nil {
			return fmt.Errorf("failed to create main branch: %w", err)
		}
	}

	// Switch to main branch
	if err := g.runGitCommand("checkout", "main"); err != nil {
		return fmt.Errorf("failed to checkout main branch: %w", err)
	}

	// If we were on a different branch, merge it into main
	if currentBranch != "HEAD" {
		// Merge the old branch into main
		if err := g.runGitCommand("merge", "--ff-only", currentBranch); err != nil {
			// If fast-forward merge fails, try regular merge
			if err := g.runGitCommand("merge", currentBranch); err != nil {
				return fmt.Errorf("failed to merge %s into main: %w", currentBranch, err)
			}
		}
	}

	return nil
}
