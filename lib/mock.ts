import type { WallpaperInput } from "@/lib/types";
import { labels } from "@/lib/wallpaper";

export function createMockWallpaperSvg(
  data: WallpaperInput,
  options: { preview?: boolean } = {},
) {
  const themeDark = data.theme === "dark";
  const width = data.device === "desktop" ? 1920 : 1080;
  const height = data.device === "desktop" ? 1080 : 1920;
  const bg = themeDark ? "#27231f" : "#fbf8f2";
  const panel = themeDark ? "#39322b" : "#fffaf1";
  const text = themeDark ? "#f8efe2" : "#292621";
  const muted = themeDark ? "#c8b9a3" : "#776b5f";
  const accent = "#b59662";
  const quote =
    data.quoteTone === "none"
      ? ""
      : data.reminder ||
    (data.quoteTone === "powerful-confident"
      ? "I am becoming the life I choose."
      : data.quoteTone === "spiritual-calm"
        ? "What is meant for me is already unfolding."
        : "Softly, steadily, I return to my vision.");

  const keywords = (data.feelingWords || "clarity, abundance, peace")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  const tags = keywords
    .map((word, index) => {
      const x = width * (0.18 + index * 0.16);
      const y = height * (data.device === "mobile" ? 0.68 : 0.74);
      return `<text x="${x}" y="${y}" fill="${muted}" font-size="${width * 0.018}" text-anchor="middle">${escapeSvg(word)}</text>`;
    })
    .join("");

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${bg}"/>
      <circle cx="${width * 0.18}" cy="${height * 0.16}" r="${width * 0.22}" fill="${accent}" opacity="0.14"/>
      <circle cx="${width * 0.82}" cy="${height * 0.32}" r="${width * 0.18}" fill="${themeDark ? "#f8efe2" : "#d9c8ac"}" opacity="0.18"/>
      <rect x="${width * 0.09}" y="${height * 0.12}" width="${width * 0.82}" height="${height * 0.66}" rx="${width * 0.035}" fill="${panel}" opacity="0.82"/>
      <path d="M ${width * 0.18} ${height * 0.42} C ${width * 0.3} ${height * 0.22}, ${width * 0.5} ${height * 0.6}, ${width * 0.66} ${height * 0.34} S ${width * 0.86} ${height * 0.36}, ${width * 0.78} ${height * 0.54}" stroke="${accent}" stroke-width="${width * 0.006}" stroke-linecap="round" opacity="0.64"/>
      <text x="${width / 2}" y="${height * 0.34}" fill="${text}" font-size="${width * 0.052}" font-family="Inter, Arial, sans-serif" font-weight="600" text-anchor="middle">Dream On The Paper</text>
      ${quote ? `<text x="${width / 2}" y="${height * 0.46}" fill="${text}" font-size="${width * 0.033}" font-family="Georgia, serif" text-anchor="middle">${escapeSvg(quote)}</text>` : ""}
      <text x="${width / 2}" y="${height * 0.56}" fill="${muted}" font-size="${width * 0.018}" font-family="Inter, Arial, sans-serif" text-anchor="middle">${escapeSvg(labels.styles[data.style])}</text>
      ${tags}
      ${options.preview ? `<rect width="${width}" height="${height}" fill="${bg}" opacity="0.22"/><text x="${width / 2}" y="${height * 0.88}" fill="${text}" opacity="0.45" font-size="${width * 0.062}" font-family="Inter, Arial, sans-serif" font-weight="700" text-anchor="middle">Preview</text>` : ""}
    </svg>
  `;

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}
