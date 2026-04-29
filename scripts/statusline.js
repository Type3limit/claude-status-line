// Claude Code status line — context window, tokens, cost, model, thinking, effort
const { stdin, stdout } = process;
const { execFileSync } = require('child_process');
let input = '';

stdin.setEncoding('utf8');
stdin.on('data', (chunk) => { input += chunk; });
stdin.on('end', () => {
  try {
    const d = JSON.parse(input);
    const parts = [];

    // Context window with colored bar
    const ctx = d.context_window || {};
    if (ctx.used_percentage !== undefined) {
      const bar = progressBar(ctx.used_percentage);
      const pct = ctx.used_percentage.toFixed(1);
      parts.push('ctx ' + bar + ' ' + pct + '%');
    }

    // Token totals (session aggregate)
    if (ctx.total_input_tokens !== undefined) {
      const total = (ctx.total_input_tokens || 0) + (ctx.total_output_tokens || 0);
      parts.push(formatTokens(total));
    }

    // Rate limits (only present on official Anthropic API).
    // Schema: rate_limits.five_hour.used_percentage / rate_limits.seven_day.used_percentage,
    // either of which may be null when the data is unavailable.
    const rl = d.rate_limits || {};
    const fiveHourPct = rl.five_hour && rl.five_hour.used_percentage;
    if (typeof fiveHourPct === 'number') {
      parts.push('5h:' + colorPct(fiveHourPct) + fiveHourPct.toFixed(0) + '%\x1b[0m');
    }
    const sevenDayPct = rl.seven_day && rl.seven_day.used_percentage;
    if (typeof sevenDayPct === 'number') {
      parts.push('7d:' + colorPct(sevenDayPct) + sevenDayPct.toFixed(0) + '%\x1b[0m');
    }

    // Model name (handle both string and object forms)
    const model = d.model;
    if (model) {
      const name = typeof model === 'string' ? model : (model.display_name || model.id || '');
      const short = name
        .replace(/^claude-/, '')
        .replace(/-\d{8}$/, '')
        .replace(/@.*$/, '');
      parts.push(short);
    }

    // Cost
    if (d.cost && d.cost.total_cost_usd !== undefined) {
      parts.push('$' + d.cost.total_cost_usd.toFixed(2));
    }

    // Thinking indicator
    if (d.thinking && d.thinking.enabled) {
      parts.push('\x1b[35mthink\x1b[0m');
    }

    // Effort level
    if (d.effort && d.effort.level) {
      parts.push(d.effort.level);
    }

    const line1 = parts.join(' \x1b[90m│\x1b[0m ');
    const line2Parts = [];
    if (d.cwd) {
      line2Parts.push('\x1b[36m' + shortenPath(d.cwd) + '\x1b[0m');
      const git = gitInfo(d.cwd);
      if (git) line2Parts.push(git);
    }
    const line2 = line2Parts.join(' ');
    stdout.write(line2 ? line1 + '\n' + line2 : line1);
  } catch (e) {
    stdout.write('statusline: ' + e.message);
  }
});

function progressBar(pct) {
  const w = 8;
  const filled = Math.max(0, Math.min(w, Math.round((pct / 100) * w)));
  const empty = w - filled;
  let color;
  if (pct > 80) color = '\x1b[31m';
  else if (pct > 50) color = '\x1b[33m';
  else color = '\x1b[32m';
  return color + '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']\x1b[0m';
}

function colorPct(pct) {
  if (pct > 80) return '\x1b[31m';
  if (pct > 50) return '\x1b[33m';
  return '\x1b[32m';
}

function shortenPath(p) {
  // normalize to forward slashes
  p = p.replace(/\\/g, '/');
  const home = (process.env.HOME || process.env.USERPROFILE || '').replace(/\\/g, '/');
  if (home && p.toLowerCase().startsWith(home.toLowerCase())) {
    p = '~' + p.slice(home.length);
  }
  if (p.length > 32) {
    p = '...' + p.slice(p.length - 29);
  }
  return p;
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(0) + 'k';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function gitInfo(cwd) {
  let out;
  try {
    out = execFileSync('git', ['status', '--porcelain=v2', '--branch'], {
      cwd,
      timeout: 500,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
  } catch (_) {
    return null;
  }
  let branch = '';
  let oid = '';
  let ahead = 0;
  let behind = 0;
  let dirty = 0;
  for (const line of out.split('\n')) {
    if (!line) continue;
    if (line.startsWith('# branch.head ')) {
      branch = line.slice(14);
    } else if (line.startsWith('# branch.oid ')) {
      oid = line.slice(13);
    } else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) { ahead = +m[1]; behind = +m[2]; }
    } else if (line[0] !== '#') {
      dirty++;
    }
  }
  if (!branch) return null;
  if (branch === '(detached)') {
    branch = '@' + oid.slice(0, 7);
  }
  const segs = [branch];
  if (dirty > 0) segs.push('*' + dirty);
  if (ahead > 0) segs.push('↑' + ahead);
  if (behind > 0) segs.push('↓' + behind);
  const color = dirty > 0 ? '\x1b[33m' : '\x1b[32m';
  return color + segs.join(' ') + '\x1b[0m';
}
