// Claude Code status line — colorful Powerline panels for session metrics
// (line 1) and project + git (line 2).
const { stdin, stdout } = process;
const { execFileSync } = require('child_process');
let input = '';

stdin.setEncoding('utf8');
stdin.on('data', (chunk) => { input += chunk; });
stdin.on('end', () => {
  try {
    const d = JSON.parse(input);
    const out = [renderLine1(d), renderLine2(d.cwd)].filter(Boolean).join('\n');
    stdout.write(out);
  } catch (e) {
    stdout.write('statusline: ' + e.message);
  }
});

// ---------- Line 1: per-metric Powerline panels ----------

function renderLine1(d) {
  const panels = [];
  const ctx = d.context_window || {};
  const rl = d.rate_limits || {};

  if (ctx.used_percentage !== undefined) {
    const pct = ctx.used_percentage.toFixed(0);
    const bar = progressBar(ctx.used_percentage);
    let val = '\u{1F4CA} Tok: ' + pct + '% ' + bar;
    if (ctx.context_window_size) val += ' ' + formatTokens(ctx.context_window_size);
    panels.push({ bg: 23, fg: 252, text: val });
  }

  if (ctx.total_input_tokens !== undefined) {
    const total = (ctx.total_input_tokens || 0) + (ctx.total_output_tokens || 0);
    panels.push({ bg: 130, fg: 252, text: '\u{1F9EE} Tot: ' + formatTokens(total) });
  }

  const fiveHour = rl.five_hour && rl.five_hour.used_percentage;
  if (typeof fiveHour === 'number') {
    panels.push({ bg: 22, fg: 252, text: '\u{1F550} 5h: ' + fiveHour.toFixed(0) + '%' });
  }

  const sevenDay = rl.seven_day && rl.seven_day.used_percentage;
  if (typeof sevenDay === 'number') {
    panels.push({ bg: 29, fg: 252, text: '\u{1F4C5} 7d: ' + sevenDay.toFixed(0) + '%' });
  }

  if (d.model) {
    const name = typeof d.model === 'string' ? d.model : (d.model.display_name || d.model.id || '');
    const short = name.replace(/^claude-/, '').replace(/-\d{8}$/, '').replace(/@.*$/, '');
    panels.push({ bg: 31, fg: 252, text: '\u{1F916} Model: ' + short });
  }

  if (d.cost && d.cost.total_cost_usd !== undefined) {
    panels.push({ bg: 136, fg: 232, text: '\u{1F4B5} Cost: $' + d.cost.total_cost_usd.toFixed(2) });
  }

  if (d.thinking && d.thinking.enabled) {
    panels.push({ bg: 88, fg: 252, text: '\u{1F9E0} Status: Thinking' });
  }

  if (d.effort && d.effort.level) {
    panels.push({ bg: 100, fg: 232, text: '⚡ Prio: ' + d.effort.level });
  }

  return panels.length ? pwlJoin(panels.map(toSeg)) : '';
}

// ---------- Line 2: project + git ----------

function renderLine2(cwd) {
  if (!cwd) return '';
  const segs = [];
  const project = basename(cwd);
  if (project) {
    segs.push(toSeg({ bg: 166, fg: 252, text: '\u{1F4C1} Project: ' + project }));
  }
  const git = gitInfo(cwd);
  if (git) {
    let bg, fg = 232;
    if (git.detached) { bg = 97; fg = 252; }
    else if (git.dirty > 0) { bg = 172; }
    else { bg = 28; }
    let text = '\u{1F33F} Git: ' + git.branch;
    if (git.dirty > 0) text += ' *' + git.dirty;
    if (git.ahead > 0) text += ' ↑' + git.ahead;
    if (git.behind > 0) text += ' ↓' + git.behind;
    segs.push(toSeg({ bg, fg, text }));
  }
  return segs.length ? pwlJoin(segs) : '';
}

// ---------- Powerline primitives ----------

// Powerline glyphs (require a Nerd Font / Powerline-patched font to render):
//   U+E0B0  right-pointing solid arrow (segment transition)
//   U+E0A0  branch icon (kept here in case future panels want it)
const PWL_ARROW = '';

function toSeg(p) {
  return {
    bg: p.bg,
    text: '\x1b[48;5;' + p.bg + 'm\x1b[38;5;' + p.fg + 'm ' + p.text + ' ',
  };
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

// ---------- Helpers ----------

function progressBar(pct) {
  const w = 10;
  const filled = Math.max(0, Math.min(w, Math.round((pct / 100) * w)));
  const empty = w - filled;
  let color;
  if (pct > 80) color = '\x1b[31m';
  else if (pct > 50) color = '\x1b[33m';
  else color = '\x1b[36m';
  // Use \x1b[39m (default fg) so we don't tear the panel background.
  return color + '[' + '='.repeat(filled) + '.'.repeat(empty) + ']\x1b[39m';
}

function basename(cwd) {
  const p = cwd.replace(/\\/g, '/').replace(/\/+$/, '');
  const tail = p.split('/').pop();
  return tail || p;
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
