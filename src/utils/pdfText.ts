import { CELL_SEP } from './siteExtract';

/**
 * Extract text lines from a PDF in the browser with pdf.js (lazy-loaded, so it
 * only ships to admins who actually import a PDF).
 *
 * pdf.js returns positioned text fragments, not lines. We group fragments by
 * baseline (y) and sort by x; a horizontal gap wider than a few characters
 * becomes CELL_SEP so table columns stay distinguishable. Scanned PDFs have no
 * text layer and come back empty.
 */
export async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    type Frag = { x: number; y: number; w: number; str: string; h: number };
    const frags: Frag[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform as number[];
      frags.push({ x, y, w: item.width, str: item.str, h: item.height || 10 });
    }
    // Top-to-bottom, then left-to-right.
    frags.sort((a, b) => b.y - a.y || a.x - b.x);

    let row: Frag[] = [];
    const flush = () => {
      if (!row.length) return;
      row.sort((a, b) => a.x - b.x);
      let text = '';
      let prevEnd = -Infinity;
      for (const f of row) {
        const charW = f.w / Math.max(f.str.length, 1) || 5;
        const gap = f.x - prevEnd;
        if (text) text += gap > charW * 3 ? CELL_SEP : gap > charW * 0.15 ? ' ' : '';
        text += f.str.trim();
        prevEnd = f.x + f.w;
      }
      lines.push(text.replace(/\s+/g, ' ').trim());
      row = [];
    };
    for (const f of frags) {
      // Same baseline if within ~40% of the text height.
      if (row.length && Math.abs(row[0].y - f.y) > Math.max(2, row[0].h * 0.4)) flush();
      row.push(f);
    }
    flush();
    page.cleanup();
  }
  await doc.destroy();
  return lines.filter(Boolean);
}
