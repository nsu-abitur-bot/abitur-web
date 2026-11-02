export const DEFAULT_ACCENT = "#4b4bd2"

export function resolveBrandMedia(value: string | null | undefined, apiBase: string): string {
  if (!value || value.startsWith("//")) {
    return ""
  }
  try {
    const url = new URL(value, apiBase.endsWith("/") ? apiBase : `${apiBase}/`)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""
  } catch {
    return ""
  }
}

function rgb(hex: string) {
  return [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16))
}
function luminance(hex: string) {
  const channels = rgb(hex).map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}
export function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0]! + 0.05) / (values[1]! + 0.05)
}
function mix(hex: string, target: number, amount: number) {
  return "#" + rgb(hex).map(c => Math.round(c + (target - c) * amount).toString(16).padStart(2, "0")).join("")
}
export function brandPalette(value: string) {
  const hex = /^#[\da-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT
  let dark = hex
  let light = hex
  for (let i = 0; Math.min(contrast(dark, "#ffffff"), contrast(dark, mix(hex, 255, 0.96)), contrast(dark, "#f6f7f9")) < 4.6 && i < 100; i++) {
    dark = mix(dark, 0, 0.06)
  }
  for (let i = 0; (contrast(light, "#1d212c") < 7 || contrast(light, mix(hex, 0, 0.65)) < 4.6) && i < 100; i++) {
    light = mix(light, 255, 0.06)
  }
  return {
    50: mix(hex, 255, 0.96),
    100: mix(hex, 255, 0.9),
    200: mix(light, 255, 0.45),
    300: light,
    400: light,
    500: dark,
    600: dark,
    700: mix(dark, 0, 0.15),
    800: mix(dark, 0, 0.3),
    900: mix(hex, 0, 0.65),
    950: mix(hex, 0, 0.8),
  }
}
export function brandVariables(value: string) {
  return Object.fromEntries(Object.entries(brandPalette(value)).flatMap(([shade, color]) => [[`--ui-color-primary-${shade}`, color], [`--color-primary-${shade}`, color]]))
}
