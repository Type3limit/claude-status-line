// Claude Code status line — soft Powerline panels for session metrics (line 1)
// and project + git (line 2). Uses 24-bit true-color so the palette can be
// genuinely muted instead of pulling from xterm's saturated 256-color cube.
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

// ---------- Palette (R, G, B) ----------
//
// Backgrounds are deliberately desaturated; the foreground is a warm cream
// (or a near-black on the brightest bgs) so contrast stays comfortable.

const FG_CREAM = [232, 226, 213];
const FG_DARK  = [40, 30, 15];

const BG = {
  tok:        [45, 95, 110],   // slate teal
  tot:        [160, 95, 60],   // terracotta
  fiveHour:   [75, 125, 85],   // moss green
  sevenDay:   [90, 145, 110],  // sage green
  model:      [60, 110, 150],  // dusty blue
  cost:       [180, 130, 50],  // warm gold (use FG_DARK)
  thinking:   [165, 75, 110],  // muted rose
  effort:     [155, 130, 50],  // olive gold (use FG_DARK)
  project:    [195, 100, 60],  // burnt orange
  gitClean:   [80, 130, 90],   // moss
  gitDirty:   [180, 130, 50],  // warm gold (use FG_DARK)
  gitDetached:[125, 95, 145],  // plum
};

// Bar gradient — same hue family across all three thresholds, slightly brighter
// than the panel bgs so the bar reads cleanly on top of them.
const BAR_LOW  = [120, 205, 195]; // soft cyan
const BAR_MED  = [220, 188, 80];  // soft amber
const BAR_HIGH = [218, 110, 110]; // soft red
const BAR_DIM  = [80, 80, 90];    // muted gray-blue for empty cells

// ---------- Line 1: per-metric Powerline panels ----------

function renderLine1(d) {
  const panels = [];
  const ctx = d.context_window || {};
  const rl = d.rate_limits || {};

  if (ctx.used_percentage !== undefined) {
    const pct = ctx.used_percentage.toFixed(0);
    let val = '\u{1F4CA} ' + pct + '% ' + progressBar(ctx.used_percentage);
    if (ctx.context_window_size) val += ' ' + formatTokens(ctx.context_window_size);
    panels.push({ bg: BG.tok, fg: FG_CREAM, text: val });
  }

  if (ctx.total_input_tokens !== undefined) {
    const total = (ctx.total_input_tokens || 0) + (ctx.total_output_tokens || 0);
    panels.push({ bg: BG.tot, fg: FG_CREAM, text: '\u{1F9EE} ' + formatTokens(total) });
  }

  const fiveHour = rl.five_hour && rl.five_hour.used_percentage;
  if (typeof fiveHour === 'number') {
    panels.push({
      bg: BG.fiveHour, fg: FG_CREAM,
      text: '\u{1F550} 5h: ' + fiveHour.toFixed(0) + '% ' + progressBar(fiveHour),
    });
  }

  const sevenDay = rl.seven_day && rl.seven_day.used_percentage;
  if (typeof sevenDay === 'number') {
    panels.push({
      bg: BG.sevenDay, fg: FG_CREAM,
      text: '\u{1F4C5} 7d: ' + sevenDay.toFixed(0) + '% ' + progressBar(sevenDay),
    });
  }

  if (d.model) {
    const name = typeof d.model === 'string' ? d.model : (d.model.display_name || d.model.id || '');
    const short = name.replace(/^claude-/, '').replace(/-\d{8}$/, '').replace(/@.*$/, '');
    panels.push({ bg: BG.model, fg: FG_CREAM, text: '\u{1F916} ' + short });
  }

  if (d.cost && d.cost.total_cost_usd !== undefined) {
    panels.push({ bg: BG.cost, fg: FG_DARK, text: '\u{1F4B5} $' + d.cost.total_cost_usd.toFixed(2) });
  }

  if (d.thinking && d.thinking.enabled) {
    panels.push({ bg: BG.thinking, fg: FG_CREAM, text: '\u{1F9E0} Thinking' });
  }

  if (d.effort && d.effort.level) {
    panels.push({ bg: BG.effort, fg: FG_DARK, text: '⚡ ' + d.effort.level });
  }

  return panels.length ? pwlJoin(panels.map(toSeg)) : '';
}

// ---------- Line 2: project + git ----------

function renderLine2(cwd) {
  if (!cwd) return '';
  const segs = [];
  const project = basename(cwd);
  if (project) {
    segs.push(toSeg({ bg: BG.project, fg: FG_CREAM, text: '\u{1F4C1} Project: ' + project }));
  }
  const git = gitInfo(cwd);
  if (git) {
    let bg, fg = FG_CREAM;
    if (git.detached) bg = BG.gitDetached;
    else if (git.dirty > 0) { bg = BG.gitDirty; fg = FG_DARK; }
    else bg = BG.gitClean;
    let text = '\u{1F33F} Git: ' + git.branch;
    if (git.dirty > 0) text += ' *' + git.dirty;
    if (git.ahead > 0) text += ' ↑' + git.ahead;
    if (git.behind > 0) text += ' ↓' + git.behind;
    segs.push(toSeg({ bg, fg, text }));
  }
  return segs.length ? pwlJoin(segs) : '';
}

// ---------- Powerline primitives ----------

// Powerline arrow — Unicode Private Use Area, requires a Nerd Font.
const PWL_ARROW = '';

function bgEsc(c) { return '\x1b[48;2;' + c[0] + ';' + c[1] + ';' + c[2] + 'm'; }
function fgEsc(c) { return '\x1b[38;2;' + c[0] + ';' + c[1] + ';' + c[2] + 'm'; }

function toSeg(p) {
  return { bg: p.bg, text: bgEsc(p.bg) + fgEsc(p.fg) + ' ' + p.text + ' ' };
}

function pwlJoin(segments) {
  let out = '';
  for (let i = 0; i < segments.length; i++) {
    out += segments[i].text;
    const next = i + 1 < segments.length ? segments[i + 1].bg : null;
    if (next !== null) {
      out += bgEsc(next) + fgEsc(segments[i].bg) + PWL_ARROW;
    } else {
      out += '\x1b[49m' + fgEsc(segments[i].bg) + PWL_ARROW + '\x1b[0m';
    }
  }
  return out;
}

// ---------- Helpers ----------

function progressBar(pct) {
  const w = 8;
  const filled = Math.max(0, Math.min(w, Math.round((pct / 100) * w)));
  const empty = w - filled;
  let color;
  if (pct > 80) color = BAR_HIGH;
  else if (pct > 50) color = BAR_MED;
  else color = BAR_LOW;
  // \x1b[39m resets only the foreground so we don't tear the panel bg.
  return '[' + fgEsc(color) + '█'.repeat(filled) + fgEsc(BAR_DIM) + '░'.repeat(empty) + '\x1b[39m]';
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
