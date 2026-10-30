export function useChartColors() {
  // Use resolved semantic colors: canvas does not resolve CSS variable aliases.
  const lineColor = useCssVar("--admin-primary")
  const backLineColor = useCssVar("--admin-rule")
  const ticksColor = useCssVar("--admin-muted")
  const gridColor = useCssVar("--admin-rule")
  const hoverFillColor = useCssVar("--admin-selection")

  return { lineColor, backLineColor, ticksColor, gridColor, hoverFillColor }
}
