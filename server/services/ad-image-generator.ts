/**
 * Ad Image Generator
 *
 * Generates Facebook/Instagram-ready ad images using Puppeteer.
 * Takes job data and produces a PNG buffer.
 *
 * Sizes:
 *   Feed: 1200x628
 *   Square (Instagram): 1080x1080
 */

import puppeteer from "puppeteer";

export interface AdImageInput {
  title: string;
  company: string;
  location: string;
  pay: string;
  requirements: string[];
  benefits: string[];
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
}

type AdFormat = "feed" | "square";

function buildFeedHtml(job: AdImageInput): string {
  const primary = job.primaryColor || "#7C3AED";
  const accent = job.accentColor || "#BE185D";

  const requirementItems = job.requirements
    .slice(0, 3)
    .map(
      (r) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="color:${accent};font-size:18px;font-weight:700;">✓</span>
        <span style="color:rgba(255,255,255,0.85);font-size:16px;font-family:'Inter',sans-serif;">${escapeHtml(r)}</span>
      </div>`
    )
    .join("");

  const benefitBadges = job.benefits
    .slice(0, 4)
    .map(
      (b) => `
      <span style="
        display:inline-block;
        padding:4px 12px;
        border-radius:20px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.15);
        color:rgba(255,255,255,0.75);
        font-size:12px;
        font-family:'Inter',sans-serif;
        margin-right:6px;
        margin-bottom:6px;
      ">${escapeHtml(b)}</span>`
    )
    .join("");

  const companyInitial = (job.company || "K").charAt(0).toUpperCase();
  const logoSection = job.logoUrl
    ? `<img src="${escapeHtml(job.logoUrl)}" style="width:160px;height:160px;border-radius:20px;object-fit:contain;background:rgba(255,255,255,0.05);box-shadow:0 8px 32px rgba(0,0,0,0.4);" />`
    : `<div style="width:160px;height:160px;border-radius:20px;background:${accent};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
        <span style="font-size:72px;font-weight:900;color:white;font-family:'Inter',sans-serif;">${companyInitial}</span>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      width:1200px; height:628px;
      overflow:hidden;
      font-family:'Inter',sans-serif;
      background: linear-gradient(135deg, ${hexToDark(primary)} 0%, #0d0d0d 100%);
      position:relative;
    }
    /* Grid overlay */
    body::before {
      content:'';
      position:absolute;
      inset:0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size:40px 40px;
      pointer-events:none;
    }
  </style>
</head>
<body>
  <div style="display:flex;height:100%;position:relative;z-index:1;">
    <!-- Left Side 60% -->
    <div style="width:60%;padding:40px 48px;display:flex;flex-direction:column;justify-content:space-between;">
      <!-- Top: Krew branding -->
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:6px;background:${primary};display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:700;font-size:12px;font-family:'Inter',sans-serif;">K</span>
        </div>
        <span style="font-size:11px;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.4);font-family:'Inter',sans-serif;">KREW RECRUITER</span>
      </div>

      <!-- Middle: Job info -->
      <div>
        <div style="font-size:13px;font-weight:600;letter-spacing:3px;color:${accent};margin-bottom:8px;font-family:'Inter',sans-serif;">NOW HIRING</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:64px;line-height:1;color:white;letter-spacing:2px;margin-bottom:12px;">${escapeHtml(job.title.toUpperCase())}</div>
        <div style="font-size:16px;color:rgba(255,255,255,0.55);margin-bottom:24px;font-family:'Inter',sans-serif;">${escapeHtml(job.company)} &bull; ${escapeHtml(job.location)}</div>

        ${
          job.pay
            ? `<div style="display:inline-block;padding:10px 24px;border-radius:10px;background:${accent};color:white;font-weight:700;font-size:22px;font-family:'Inter',sans-serif;margin-bottom:24px;">${escapeHtml(job.pay)}</div>`
            : ""
        }

        <div style="margin-bottom:20px;">
          ${requirementItems}
        </div>

        ${
          benefitBadges
            ? `<div style="display:flex;flex-wrap:wrap;gap:0;">${benefitBadges}</div>`
            : ""
        }
      </div>

      <!-- Bottom: Apply CTA -->
      <div>
        <div style="display:inline-flex;align-items:center;gap:8px;padding:10px 28px;border:2px solid rgba(255,255,255,0.6);border-radius:8px;color:white;font-weight:600;font-size:14px;font-family:'Inter',sans-serif;letter-spacing:1px;">
          APPLY NOW
          <span style="font-size:16px;">→</span>
        </div>
      </div>
    </div>

    <!-- Right Side 40% -->
    <div style="width:40%;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;position:relative;">
      <!-- Decorative accent -->
      <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(to bottom,${accent},transparent);"></div>
      ${logoSection}
    </div>
  </div>
</body>
</html>`;
}

function buildSquareHtml(job: AdImageInput): string {
  const primary = job.primaryColor || "#7C3AED";
  const accent = job.accentColor || "#BE185D";

  const requirementItems = job.requirements
    .slice(0, 3)
    .map(
      (r) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="color:${accent};font-size:16px;font-weight:700;">✓</span>
        <span style="color:rgba(255,255,255,0.85);font-size:15px;font-family:'Inter',sans-serif;">${escapeHtml(r)}</span>
      </div>`
    )
    .join("");

  const benefitBadges = job.benefits
    .slice(0, 4)
    .map(
      (b) => `
      <span style="
        display:inline-block;
        padding:4px 12px;
        border-radius:20px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.15);
        color:rgba(255,255,255,0.75);
        font-size:12px;
        font-family:'Inter',sans-serif;
        margin-right:6px;
        margin-bottom:6px;
      ">${escapeHtml(b)}</span>`
    )
    .join("");

  const squareInitial = (job.company || "K").charAt(0).toUpperCase();
  const logoSection = job.logoUrl
    ? `<img src="${escapeHtml(job.logoUrl)}" style="width:120px;height:120px;border-radius:16px;object-fit:contain;background:rgba(255,255,255,0.05);box-shadow:0 8px 32px rgba(0,0,0,0.4);" />`
    : `<div style="width:120px;height:120px;border-radius:16px;background:${accent};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
        <span style="font-size:56px;font-weight:900;color:white;font-family:'Inter',sans-serif;">${squareInitial}</span>
      </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      width:1080px; height:1080px;
      overflow:hidden;
      font-family:'Inter',sans-serif;
      background: linear-gradient(135deg, ${hexToDark(primary)} 0%, #0d0d0d 100%);
      position:relative;
    }
    body::before {
      content:'';
      position:absolute;
      inset:0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size:40px 40px;
      pointer-events:none;
    }
  </style>
</head>
<body>
  <div style="height:100%;padding:48px;display:flex;flex-direction:column;justify-content:space-between;position:relative;z-index:1;">
    <!-- Top: Krew branding + Logo -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:6px;background:${primary};display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:700;font-size:12px;font-family:'Inter',sans-serif;">K</span>
        </div>
        <span style="font-size:11px;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.4);font-family:'Inter',sans-serif;">KREW RECRUITER</span>
      </div>
      ${logoSection}
    </div>

    <!-- Middle: Job info -->
    <div>
      <div style="font-size:13px;font-weight:600;letter-spacing:3px;color:${accent};margin-bottom:12px;font-family:'Inter',sans-serif;">NOW HIRING</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:1;color:white;letter-spacing:2px;margin-bottom:16px;">${escapeHtml(job.title.toUpperCase())}</div>
      <div style="font-size:18px;color:rgba(255,255,255,0.55);margin-bottom:28px;font-family:'Inter',sans-serif;">${escapeHtml(job.company)} &bull; ${escapeHtml(job.location)}</div>

      ${
        job.pay
          ? `<div style="display:inline-block;padding:12px 28px;border-radius:10px;background:${accent};color:white;font-weight:700;font-size:24px;font-family:'Inter',sans-serif;margin-bottom:28px;">${escapeHtml(job.pay)}</div>`
          : ""
      }

      <div style="margin-bottom:24px;">
        ${requirementItems}
      </div>

      ${benefitBadges ? `<div style="display:flex;flex-wrap:wrap;">${benefitBadges}</div>` : ""}
    </div>

    <!-- Bottom: Apply CTA -->
    <div style="display:flex;justify-content:center;">
      <div style="display:inline-flex;align-items:center;gap:8px;padding:14px 36px;border:2px solid rgba(255,255,255,0.6);border-radius:8px;color:white;font-weight:600;font-size:16px;font-family:'Inter',sans-serif;letter-spacing:1px;">
        APPLY NOW
        <span style="font-size:18px;">→</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate an ad image as a PNG buffer.
 */
export async function generateAdImage(
  job: AdImageInput,
  format: AdFormat = "feed"
): Promise<Buffer> {
  const html = format === "square" ? buildSquareHtml(job) : buildFeedHtml(job);
  const width = format === "square" ? 1080 : 1200;
  const height = format === "square" ? 1080 : 628;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for fonts to load
    await page.evaluate(() =>
      document.fonts.ready
    );

    const buffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });

    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}

// ============ Helpers ============

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert a hex color to a much darker version for gradient backgrounds.
 * e.g. #7C3AED -> #1a0f33
 */
function hexToDark(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const dr = Math.round(r * 0.12);
  const dg = Math.round(g * 0.08);
  const db = Math.round(b * 0.15);
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}
