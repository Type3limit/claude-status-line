---
name: setup-statusline
description: Configure the status line to display context, tokens, and rate limits
user-invocable: true
argument-hint: [node-path]
allowed-tools: [Read, Edit, Bash, Write]
---

# Setup Status Line Info

Configure Claude Code's status bar to show context window usage, token count, 5h/7d rate limit usage, model name, thinking state, and effort level.

## Steps

### 1. Locate the status line script

The plugin ships a Node.js script at:
```
.plugins/local/statusline-info/scripts/statusline.js
```

The full path is `{user.home}/.claude/plugins/local/statusline-info/scripts/statusline.js`.

If the user provided a custom node path as an argument, use that instead.

### 2. Ensure Node.js is available

Run `node --version` to verify. If `node` is not on PATH, ask the user for the full path to their Node.js binary.

### 3. Configure settings.json

Read the user's `~/.claude/settings.json` file, then add or update the `statusLine` and `refreshInterval` keys:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /home/<user>/.claude/plugins/local/statusline-info/scripts/statusline.js"
  },
  "refreshInterval": 30
}
```

On Windows, use the actual absolute path (e.g., `C:/Users/...`). Always use forward slashes.

### 4. Confirm

Tell the user the setup is complete. The status line will appear at the bottom of Claude Code on the next prompt. It refreshes every 30 seconds.

The status line displays:
- **ctx** — context window usage with a colored progress bar (green/yellow/red) and percentage, plus current token count
- **5h** — 5-hour rate limit usage percentage (color-coded)
- **7d** — 7-day rate limit usage percentage (color-coded)
- **model** — shortened model name (e.g., `sonnet`, `opus`)
- **think** — (magenta) shown when thinking mode is on
- **effort** — current effort level (e.g., `max`)
