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

    // Context window with colored bar, percentage, and total window size
    const ctx = d.context_window || {};
    if (ctx.used_percentage !== undefined) {
      const bar = progressBar(ctx.used_percentage);
      const pct = ctx.used_percentage.toFixed(1);
      let seg = 'ctx ' + bar + ' ' + pct + '%';
      if (ctx.context_window_size) {
        seg += ' / ' + formatTokens(ctx.context_window_size);
      }
      parts.push(seg);
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
    const line2 = renderLine2(d.cwd);
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

function pathSegments(cwd) {
  let p = cwd.replace(/\\/g, '/');
  const home = (process.env.HOME || process.env.USERPROFILE || '').replace(/\\/g, '/');
  let homeAlias = false;
  if (home && p.toLowerCase().startsWith(home.toLowerCase())) {
    p = p.slice(home.length).replace(/^\/+/, '');
    homeAlias = true;
  }
  const segs = p.split('/').filter((s) => s.length > 0);
  if (homeAlias) segs.unshift('~');
  // Cap to first segment + last 2 to avoid runaway widths on deep trees.
  if (segs.length > 4) {
    return [segs[0], '…', segs[segs.length - 2], segs[segs.length - 1]];
  }
  return segs;
}

// Powerline glyphs (require a Nerd Font / Powerline-patched font to render):
//    right-pointing solid arrow (segment transition)
//    right-pointing thin chevron (intra-segment separator)
//    branch icon
const PWL_ARROW = '';
const PWL_CHEVRON = '';
const PWL_BRANCH = '';

function pwlSeg(bg, fg, text) {
  return { bg, text: '\x1b[48;5;' + bg + 'm\x1b[38;5;' + fg + 'm ' + text + ' ' };
}

function pwlJoin(segments) {
  let out = '';
  for (let i = 0; i < segments.length; i++) {
    out += segments[i].text;
    const nextBg = i + 1 < segments.length ? segments[i + 1].bg : null;
    if (nextBg !== null) {
      out += '\x1b[48;5;' + nextBg + 'm\x1b[38;5;' + segments[i].bg + 'm' + PWL_ARROW;
    } else {
      out += '\x1b[49m\x1b[38;5;' + segments[i].bg + 'm' + PWL_ARROW + '\x1b[0m';
    }
  }
  return out;
}

function renderPathSegment(cwd) {
  const segs = pathSegments(cwd);
  if (segs.length === 0) return null;
  const bg = 24;     // dark teal-blue
  const fg = 252;    // near-white
  const dim = 110;   // muted blue-gray for chevrons
  const sep = '\x1b[38;5;' + dim + 'm ' + PWL_CHEVRON + ' \x1b[38;5;' + fg + 'm';
  const text = segs.join(sep);
  return pwlSeg(bg, fg, text);
}

function renderGitSegment(info) {
  if (!info) return null;
  const fg = 232; // near-black, contrasts with the bright bgs below
  let bg;
  if (info.detached) bg = 97;       // muted purple
  else if (info.dirty > 0) bg = 172; // amber
  else bg = 28;                      // green
  let text = PWL_BRANCH + ' ' + info.branch;
  if (info.dirty > 0) text += ' *' + info.dirty;
  if (info.ahead > 0) text += ' ↑' + info.ahead;
  if (info.behind > 0) text += ' ↓' + info.behind;
  return pwlSeg(bg, fg, text);
}

function renderLine2(cwd) {
  if (!cwd) return '';
  const segments = [];
  const pathSeg = renderPathSegment(cwd);
  if (pathSeg) segments.push(pathSeg);
  const gitSeg = renderGitSegment(gitInfo(cwd));
  if (gitSeg) segments.push(gitSeg);
  return segments.length ? pwlJoin(segments) : '';
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
  let detached = false;
  if (branch === '(detached)') {
    branch = '@' + oid.slice(0, 7);
    detached = true;
  }
  return { branch, dirty, ahead, behind, detached };
}
