# Claude Status Line

A Claude Code plugin that displays context window usage, token counts, session cost, working directory, model info, thinking mode, and effort level in the status bar.

## What it shows

```
~/projects/my-app │ ctx [████░░░░] 45.2% │ 265k │ sonnet-4 │ $4.12 │ think │ max
```

| Segment | Description |
|---------|-------------|
| `~/projects/my-app` | Current working directory (cyan, shortened) |
| `ctx [████░░░░] 45.2%` | Context window usage with color-coded bar (green/yellow/red) |
| `265k` | Total input + output tokens this session |
| `sonnet-4` | Shortened model name |
| `$4.12` | Session cost in USD |
| `think` | Thinking mode indicator (magenta) |
| `max` | Current effort level |

Rate limits (5h/7d) also display when using the official Anthropic API.

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

Or run `/setup-statusline` after adding this plugin to Claude Code.

## Requirements

- Node.js
