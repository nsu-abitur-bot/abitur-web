export const useDark = () => {
  const colorMode = useColorMode()
  return computed({
    get() {
      return colorMode.value === "dark"
    },
    set(_isDark) {
      colorMode.preference = _isDark ? "dark" : "light"
    },
  })
}
