# Claude Status Line

A Claude Code plugin that renders a colorful, two-line Powerline status bar: per-metric session panels on top, project + git panels on the bottom.

## What it shows

Each metric is its own colored Powerline panel with an emoji icon and the value. The palette uses 24-bit true-color RGB so it stays soft and desaturated rather than the saturated xterm 256-color cube. Empty metrics simply collapse, so you only see the panels you have data for.

```
 📊 14% [█░░░░░░░] 1.0M  🧮 80k  🕐 5h: 68% [█████░░░]  📅 7d: 33% [███░░░░░]  🤖 opus-4-7  💵 $5.17  🧠 Thinking  ⚡ High 
 📁 Project: multi-llm-agent-workflow  🌿 Git: main *1 ↑1 
```

### Line 1 — session metrics

| Panel | Background | Description |
|-------|-----------|-------------|
| `📊 14% [█░░░░░░░] 1.0M` | slate teal | Context window: percentage, color-coded bar, and total window size |
| `🧮 80k` | terracotta | Session total (input + output) tokens |
| `🕐 5h: 68% [█████░░░]` | moss green | 5-hour rate-limit usage with bar (only on the official Anthropic API) |
| `📅 7d: 33% [███░░░░░]` | sage green | 7-day rate-limit usage with bar (only on the official Anthropic API) |
| `🤖 opus-4-7` | dusty blue | Shortened model name |
| `💵 $5.17` | warm gold | Session cost in USD |
| `🧠 Thinking` | muted rose | Shown only when extended thinking is on |
| `⚡ High` | olive gold | Current effort level |

The progress bar (`█░`) is cyan when usage ≤ 50%, amber 50–80%, red above 80%; empty cells are a muted gray-blue.

### Line 2 — project + git

| Panel | Background | Description |
|-------|-----------|-------------|
| `📁 Project: <name>` | burnt orange | Basename of the current working directory |
| `🌿 Git: <branch> [*N ↑N ↓N]` | moss / gold / plum | Branch with optional dirty count and ahead/behind markers; color flips gold when dirty and plum on detached HEAD |

Git data comes from a single `git status --porcelain=v2 --branch` call with a 500ms timeout; non-git directories silently render only the project panel.

## Install

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/claude-status-line/scripts/statusline.js",
    "refreshInterval": 30
  }
}
```

On Windows use forward slashes in the path (e.g. `C:/Users/you/.claude/local-plugins/claude-status-line/scripts/statusline.js`).

Or run `/setup-statusline` after adding this plugin to Claude Code.

## Requirements

- Node.js (v18+ recommended).
- A terminal that supports 24-bit true-color (Windows Terminal, iTerm2, Alacritty, WezTerm, kitty, modern VS Code, etc. — basically anything from the last few years).
- A [Nerd Font](https://www.nerdfonts.com/) for the Powerline arrow `` between panels. Per-metric icons are emoji and use the OS emoji-font fallback, so they render even without a Nerd Font.

## Troubleshooting

### The arrows show as boxes or `??` (e.g. in Windows Terminal)

Your terminal isn't using a Nerd Font. The Powerline arrow lives in Unicode's Private Use Area (U+E0B0), which is empty in most stock fonts.

**Windows Terminal**

1. Pick a Nerd Font from <https://www.nerdfonts.com/font-downloads> — `JetBrainsMono Nerd Font`, `FiraCode Nerd Font`, and `CaskaydiaCove Nerd Font` are good defaults.
2. Download the font's ZIP, extract, and for each `.ttf` file: right-click → **Install for all users**.
3. Open Windows Terminal → **Ctrl+,** → select your profile (or *Defaults* to apply globally) → **Appearance** → **Font face** → choose the Nerd Font.
4. Save and reopen the terminal. The arrows should now render correctly.

**macOS Terminal / iTerm2 / Alacritty / WezTerm / VS Code**

Same idea — install a Nerd Font system-wide and set it as your terminal's font. iTerm2 and VS Code both have a *Non-ASCII Font* setting if you want to keep your existing font for code and only use the Nerd Font for these glyphs.

### Emoji render as monochrome boxes

Your terminal lacks an emoji font fallback. On Windows Terminal this is rare (Segoe UI Emoji is bundled). On minimal Linux containers, install something like `fonts-noto-color-emoji`.
