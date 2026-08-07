const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function color(code, text) {
  return useColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

function icon(status) {
  if (status === 'pass') return color('32', '✓');
  if (status === 'fail') return color('31', '✗');
  if (status === 'skip') return color('33', '○');
  return color('90', '·');
}

/** Render results as an ASCII tree keyed by the combination id path. */
export function renderTree(results) {
  const root = { name: '', children: new Map(), status: null };
  for (const r of results) {
    let node = root;
    for (const part of r.id.split('/')) {
      if (!node.children.has(part)) node.children.set(part, { name: part, children: new Map(), status: null });
      node = node.children.get(part);
    }
    node.status = r.status;
  }
  const lines = [];
  const walk = (node, prefix) => {
    const kids = [...node.children.values()];
    kids.forEach((child, index) => {
      const last = index === kids.length - 1;
      const branch = last ? '└─ ' : '├─ ';
      const leaf = child.children.size === 0 ? `${icon(child.status)} ` : '';
      lines.push(`${prefix}${branch}${leaf}${child.name}`);
      walk(child, prefix + (last ? '   ' : '│  '));
    });
  };
  walk(root, '');
  return lines.join('\n');
}

export function summarize(results) {
  const summary = { pass: 0, fail: 0, skip: 0, total: results.length };
  for (const r of results) {
    if (r.status === 'pass') summary.pass += 1;
    else if (r.status === 'fail') summary.fail += 1;
    else if (r.status === 'skip') summary.skip += 1;
  }
  return summary;
}

export function renderSummary(summary) {
  const parts = [
    color('32', `${summary.pass} passed`),
    color('31', `${summary.fail} failed`),
    color('33', `${summary.skip} skipped`),
  ];
  return `${parts.join('  ')}  (${summary.total} total)`;
}

/** GitHub Actions job-summary markdown (no ANSI). */
export function renderMarkdown(results, summary) {
  const lines = ['## E2E install matrix', ''];
  lines.push(`**${summary.pass} passed · ${summary.fail} failed · ${summary.skip} skipped** (${summary.total} total)`, '');
  const failures = results.filter((r) => r.status === 'fail');
  if (failures.length) {
    lines.push('### Failures', '', '| Combination | Error |', '| --- | --- |');
    for (const f of failures) {
      const err = (f.error || 'see steps').split('\n')[0].replace(/\|/g, '\\|');
      lines.push(`| \`${f.id}\` | ${err} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
