# Claude Status Line

A Claude Code plugin that renders a two-line, Powerline-styled status bar: session metrics (context window, tokens, rate limits, model, cost, thinking, effort) on top, working directory + git on the bottom.

## What it shows

Three colored Powerline panels, each separated by  arrows. Per-metric icons use Unicode emoji (rendered by your OS's emoji font), so they show up even when other glyphs don't.

```
 📊 [████░░░░] 45.2% / 200k › 🧮 265k › 🕐 43% › 📅 85%   🤖 opus-4-7 › 💵 $4.12 › 🧠 think › ⚡ xhigh 
  ~  Code  my-app   main *3 ↑2
```

### Line 1 — two metric panels

**Panel A · deep teal-blue · context & limits**

| Segment | Description |
|---------|-------------|
| `📊 [████░░░░] 45.2% / 200k` | Context window usage: color-coded bar (green/yellow/red), percentage, and total window size |
| `🧮 265k` | Total input + output tokens this session |
| `🕐 43%` | 5-hour rate-limit usage, color-coded (only on the official Anthropic API) |
| `📅 85%` | 7-day rate-limit usage, color-coded (only on the official Anthropic API) |

**Panel B · deep purple · this session**

| Segment | Description |
|---------|-------------|
| `🤖 opus-4-7` | Shortened model name |
| `💵 $4.12` | Session cost in USD |
| `🧠 think` | Thinking mode indicator (magenta) |
| `⚡ xhigh` | Current effort level |

Each panel is rendered only when it has at least one populated segment, so users without rate-limit data, cost, or thinking simply see fewer parts.

### Line 2 — working directory + git

| Block | Description |
|-------|-------------|
| Path (blue) | Path segments joined with `` chevrons; deep paths collapse to `first › … › parent › leaf` |
| Branch (green) | Clean working tree |
| Branch (amber) | Dirty tree, suffixed with `*N` (modified/untracked file count) |
| Branch (purple) | Detached HEAD, shown as `@<short-sha>` |
| `↑N` / `↓N` | Commits ahead / behind upstream |

Git data comes from a single `git status --porcelain=v2 --branch` call with a 500ms timeout; non-git directories silently render the path block alone.

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
- A [Nerd Font](https://www.nerdfonts.com/) in your terminal for the Powerline arrows (``, ``) and the branch icon (``). Per-metric icons are emoji and don't need a Nerd Font.

## Troubleshooting

### The arrows / branch icon show as boxes or `??`

Your terminal isn't using a Nerd Font. The Powerline glyphs live in Unicode's Private Use Area (U+E0A0–U+E0BF), which is empty in most stock fonts.

**Windows Terminal**

1. Pick a Nerd Font from <https://www.nerdfonts.com/font-downloads> — `JetBrainsMono Nerd Font`, `FiraCode Nerd Font`, and `CaskaydiaCove Nerd Font` are all good choices.
2. Download the font's ZIP, extract it, then for each `.ttf` file: right-click → **Install for all users**.
3. Open Windows Terminal → **Ctrl+,** → select your profile (or *Defaults* to apply globally) → **Appearance** → **Font face** → choose the Nerd Font (e.g. `JetBrainsMono Nerd Font`).
4. Save and reopen the terminal. The arrows should now render correctly.

**macOS Terminal / iTerm2 / Alacritty / WezTerm / VS Code**

Same idea — install a Nerd Font system-wide and set it as your terminal's font. iTerm2 and VS Code both have a *Non-ASCII Font* setting if you want to keep your existing font for code and only use the Nerd Font for these glyphs.

### Emoji render as monochrome boxes

Your terminal lacks an emoji font fallback. On Windows Terminal this is rare (Segoe UI Emoji is bundled), but on minimal Linux containers you may need to install `fonts-noto-color-emoji` or similar.
