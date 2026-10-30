export default defineAppConfig({
  ui: {
    colors: { primary: "indigo", neutral: "slate" },
    button: { slots: { base: "rounded-lg font-medium" }, defaultVariants: { size: "sm" } },
    input: { slots: { base: "rounded-lg" } },
    select: { slots: { base: "rounded-lg" } },
    textarea: { slots: { base: "rounded-lg" } },
  },
})
