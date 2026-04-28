export function useChartColors() {
  // Цвет линии графика.
  const lineColor = useCssVar("--color-primary-500")
  // Цвет линии графика на заднем фоне.
  const backLineColor = useCssVar("--color-neutral-200", "--color-neutral-700")
  // Цвет подписей.
  // Копия --ui-text-muted.
  const ticksColor = useCssVar("--color-neutral-500", "--color-neutral-400")
  // Цвет линий сетки, подобрал на глаз.
  // на самом деле там (в темной теме) #909090 + 40% opacity
  const gridColor = useCssVar("--color-neutral-100", "--color-neutral-800")
  // Цвет заливки под графиком при наведении.
  const hoverFillColor = useCssVar("--color-primary-200", "--color-primary-800")

  return { lineColor, backLineColor, ticksColor, gridColor, hoverFillColor }
}
