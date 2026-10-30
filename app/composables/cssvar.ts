import { useMutationObserver } from "@vueuse/core"

/** Read chart colors without writing resolved values back into the theme. */
export function useCssVar(light: string, dark?: string) {
  const isDark = useDark()
  const value = ref("")
  const root = import.meta.client ? document.documentElement : undefined
  function update() {
    const color = isDark.value && dark ? dark : light
    value.value = color.startsWith("--") ? root ? getComputedStyle(root).getPropertyValue(color).trim() : "" : color
  }
  onMounted(update)
  watch(isDark, () => nextTick(update))
  useMutationObserver(root, update, { attributes: true, attributeFilter: ["class", "style"] })
  return readonly(value)
}
