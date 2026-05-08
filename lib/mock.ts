import type { WallpaperInput } from "@/lib/types";

export function createMockWallpaperSvg(
  data: WallpaperInput,
  options: { preview?: boolean } = {},
) {
  const themeDark = data.theme === "dark";
  const width = data.device === "desktop" ? 1920 : 1080;
  const height = data.device === "desktop" ? 1080 : 1920;
  const bg = themeDark ? "#27231f" : "#fbf8f2";
  const panel = themeDark ? "#39322b" : "#fffaf1";
  const accent = "#b59662";

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${bg}"/>
      <circle cx="${width * 0.18}" cy="${height * 0.16}" r="${width * 0.22}" fill="${accent}" opacity="0.14"/>
      <circle cx="${width * 0.82}" cy="${height * 0.32}" r="${width * 0.18}" fill="${themeDark ? "#f8efe2" : "#d9c8ac"}" opacity="0.18"/>
      <rect x="${width * 0.09}" y="${height * 0.12}" width="${width * 0.82}" height="${height * 0.66}" rx="${width * 0.035}" fill="${panel}" opacity="0.82"/>
      <path d="M ${width * 0.18} ${height * 0.42} C ${width * 0.3} ${height * 0.22}, ${width * 0.5} ${height * 0.6}, ${width * 0.66} ${height * 0.34} S ${width * 0.86} ${height * 0.36}, ${width * 0.78} ${height * 0.54}" stroke="${accent}" stroke-width="${width * 0.006}" stroke-linecap="round" opacity="0.64"/>
      <rect x="${width * 0.18}" y="${height * 0.28}" width="${width * 0.22}" height="${height * 0.12}" rx="${width * 0.02}" fill="${themeDark ? "#4e463e" : "#eadbc5"}" opacity="0.8"/>
      <rect x="${width * 0.46}" y="${height * 0.32}" width="${width * 0.28}" height="${height * 0.18}" rx="${width * 0.025}" fill="${themeDark ? "#463d36" : "#efe4d3"}" opacity="0.76"/>
      <circle cx="${width * 0.72}" cy="${height * 0.62}" r="${width * 0.08}" fill="${accent}" opacity="0.2"/>
      <rect x="${width * 0.22}" y="${height * 0.62}" width="${width * 0.3}" height="${height * 0.08}" rx="${width * 0.018}" fill="${themeDark ? "#51483f" : "#f4ece0"}" opacity="0.84"/>
      ${options.preview ? `<rect width="${width}" height="${height}" fill="${bg}" opacity="0.16"/>` : ""}
    </svg>
  `;

  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}
