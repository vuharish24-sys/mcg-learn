import sharp from "sharp";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Overlays a title as a legible text card at the bottom of a background image.
 * Text-to-image models (Pollinations included) can't reliably render readable
 * text into a picture, so this composites real, crisp text on top in code
 * instead — a gradient scrim plus wrapped title, sized to the image. Renders
 * via sharp/libvips (bundles librsvg), no external service or native install.
 */
export async function composeCoverImage(background: Buffer, title: string): Promise<Buffer> {
  const image = sharp(background);
  const metadata = await image.metadata();
  const width = metadata.width ?? 800;
  const height = metadata.height ?? 800;

  const fontSize = Math.round(width / 16);
  const lineHeight = Math.round(fontSize * 1.25);
  const padding = Math.round(fontSize * 0.9);
  // Bold sans-serif averages ~0.62x fontSize per character; the 0.9 safety
  // factor leaves margin since this is an estimate, not real text measurement
  // (no canvas/font-metrics available here) — better to wrap one word early
  // than to clip text off the right edge.
  const availableWidth = width - padding * 2;
  const maxCharsPerLine = Math.max(8, Math.floor((availableWidth / (fontSize * 0.62)) * 0.9));
  const lines = wrapText(title, maxCharsPerLine).slice(0, 4);
  const bandHeight = lineHeight * lines.length + padding * 2;
  const bandY = Math.max(0, height - bandHeight);

  const textSpans = lines
    .map((line, i) => `<tspan x="${padding}" dy="${i === 0 ? fontSize : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${bandY}" width="${width}" height="${bandHeight}" fill="url(#fade)"/>
      <text x="${padding}" y="${bandY + padding}" font-family="Arial, Helvetica, sans-serif" font-weight="700"
            font-size="${fontSize}" fill="#ffffff">${textSpans}</text>
    </svg>`;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
