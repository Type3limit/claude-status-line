# Claude Status Line

A Claude Code plugin that renders a two-line, Powerline-styled status bar: a session-metrics row (context window, tokens, rate limits, model, cost, thinking, effort) and a working-directory + git row.

## What it shows

Both rows render as Powerline-style panels with chevron separators, color-coded values, and Nerd Font icons:

```
 ctx [████░░░░] 45.2% / 200k ›  265k ›   43% ›   85% ›  opus-4-7 ›  $4.12 ›   think ›    xhigh 
  ~  Code  my-app   main *3 ↑2
```

### Line 1 — session metrics (dark gray panel)

| Segment | Description |
|---------|-------------|
| `ctx [████░░░░] 45.2% / 200k` | Context window usage: color-coded bar (green/yellow/red), percentage, and total window size |
| `265k` | Total input + output tokens this session |
| ` 43%` | 5-hour rate-limit usage, color-coded (only on the official Anthropic API) |
| ` 85%` | 7-day rate-limit usage, color-coded (only on the official Anthropic API) |
| `opus-4-7` | Shortened model name |
| `$4.12` | Session cost in USD |
| ` think` | Thinking mode indicator (magenta microchip) |
| ` xhigh` | Current effort level (yellow bolt) |

### Line 2 — working directory + git (blue + accent panels)

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

- Node.js
- A [Nerd Font](https://www.nerdfonts.com/) in your terminal — both rows use Powerline arrows (``, ``) and Nerd Font icons (clock ``, calendar ``, microchip ``, bolt ``, branch ``). Without one, those slots render as boxes.
