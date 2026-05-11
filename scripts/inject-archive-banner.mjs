// Post-build step: stamp an "ARCHIVED" banner onto a built Vite site.
//
// Run this in the archive deploy job AFTER `npm run build`, against the dist
// directory. The banner sits above everything else and links back to the live
// site so visitors don't mistake the archive for the current campaign.
//
// Why this lives in scripts/ and not in React: the archived code (talarico-archive
// tag) is frozen — we cannot edit it. Every archive build needs the banner, so
// we inject at build time. Future archive snapshots get the same treatment for
// free without touching their source.
//
// Usage:
//   node scripts/inject-archive-banner.mjs dist/
//   node scripts/inject-archive-banner.mjs dist/ --label "Talarico 2026 Senate Primary"
//
// Args:
//   <dist-dir>           Required. Path to the built site.
//   --label <text>       Optional. Banner heading. Default: "Archived deployment".
//   --live-url <url>     Optional. URL of the live site to link to from the banner.
//   --live-label <text>  Optional. Label for the live-site link. Default: "View live site".

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      opts[a.slice(2)] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  return { positional, opts };
}

const { positional, opts } = parseArgs(process.argv.slice(2));
const distDir = positional[0];
if (!distDir) {
  console.error('usage: node scripts/inject-archive-banner.mjs <dist-dir> [--label TEXT] [--live-url URL] [--live-label TEXT]');
  process.exit(2);
}

const label = opts.label ?? 'Archived deployment';
const liveUrl = opts['live-url'] ?? '';
const liveLabel = opts['live-label'] ?? 'View live site';

const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`No index.html at ${indexPath}`);
  process.exit(1);
}

// HTML-escape to keep arbitrary --label values from breaking the markup.
function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const liveLink = liveUrl
  ? `<a href="${esc(liveUrl)}" class="archive-banner-link">${esc(liveLabel)} →</a>`
  : '';

// Inline the styles so we don't need to ship an extra CSS file. The banner is a
// normal block element at the top of <body> — it scrolls naturally with the page,
// which is fine for an archive context (visitors only need to see it once on load).
// The existing app's sticky header continues to work; on scroll it sticks just
// below the banner since the banner has scrolled out of view.
const STYLE_BLOCK = `
<style id="archive-banner-style">
.archive-banner {
  background: #fef3c7;
  border-bottom: 1px solid #f59e0b;
  color: #78350f;
  padding: 10px 16px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  text-align: center;
  z-index: 1100;
}
.archive-banner-tag {
  background: #f59e0b;
  color: #fff;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.archive-banner-text {
  font-weight: 500;
}
.archive-banner-link {
  color: #78350f;
  font-weight: 700;
  text-decoration: underline;
}
.archive-banner-link:hover {
  color: #92400e;
}
</style>`;

const BANNER_HTML = `
<div class="archive-banner" role="status" aria-label="Archive notice">
  <span class="archive-banner-tag">Archive</span>
  <span class="archive-banner-text">${esc(label)} — read-only snapshot.</span>
  ${liveLink}
</div>`;

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('id="archive-banner-style"')) {
  console.log('Banner already injected — skipping.');
  process.exit(0);
}

// Inject style before </head>; banner immediately after <body>.
html = html.replace(/<\/head>/i, `${STYLE_BLOCK}\n</head>`);
html = html.replace(/<body([^>]*)>/i, `<body$1>\n${BANNER_HTML}`);

fs.writeFileSync(indexPath, html);
console.log(`Injected archive banner into ${indexPath}`);
console.log(`  label:     ${label}`);
if (liveUrl) console.log(`  live-url:  ${liveUrl}`);
