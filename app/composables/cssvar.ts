import { useCssVar as useCssVarVueuse } from "@vueuse/core"

function useCssVarOrValue(value: string) {
  return value.startsWith("--") ? useCssVarVueuse(value) : ref(value)
}

export function useCssVar(light: string, dark?: string) {
  const isDark = useDark()
  const lightVar = useCssVarOrValue(light)
  const darkVar = dark ? useCssVarOrValue(dark) : undefined
  return dark ? computed(() => isDark.value ? darkVar!.value : lightVar.value) : lightVar
}
