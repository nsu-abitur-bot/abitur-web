import * as fs from "node:fs/promises"
import { fileURLToPath } from "node:url"

import type { VueTSConfig } from "nuxt/schema"
import vueCssModule from "vite-plugin-vue-css-module"

function fixTsConfig(tsConfig: VueTSConfig) {
  // убрать лишние стандартные алиасы, чтобы остался ровно один ~, который и будем использовать
  for (const p of ["~~", "@@", "@"]) {
    delete tsConfig.compilerOptions!.paths[p]
    delete tsConfig.compilerOptions!.paths[p + "/*"]
  }
}

export default defineNuxtConfig({
  compatibilityDate: "2026-03-02",

  //
  // Build, imports, language
  //

  ssr: false,

  alias: {
    "#server": fileURLToPath(new URL("./server", import.meta.url)),
  },

  app: {
    baseURL: "/abitur-web/",
  },

  typescript: {
    tsConfig: {
      vueCompilerOptions: {
        plugins: ["@vue/language-plugin-pug"],
      },
    },
  },

  nitro: {
    esbuild: {
      options: {
        // Сборка серверного билда в текущую версию Node.
        target: "ESNext",
      },
    },
    typescript: {
      tsConfig: {
        compilerOptions: {
          // https://github.com/nuxt/nuxt/issues/32941
          noUncheckedIndexedAccess: true,
        },
      },
    },
    hooks: {
      "types:extend": ({ tsConfig }) => {
        fixTsConfig(tsConfig!)
      },
      "compiled": async (nitro) => {
        // Хотфикс чтобы не падала прод. сборка при запуске:
        // https://github.com/svg/svgo/issues/2149#issuecomment-3723806500
        const getSourcePath = (pkg: string, ver: string) => new URL(`node_modules/.pnpm/${pkg}@${ver}/node_modules/${pkg}`, import.meta.url).pathname
        const getTargetPath = (pkgPath: string) => `${nitro.options.output.serverDir}/node_modules/${pkgPath}`
        const copy = async (source: string, target: string) => await fs.cp(source, target, { recursive: true })
        for (const version of ["2.2.1", "3.1.0"]) {
          await copy(
            getSourcePath("css-tree", version) + "/data",
            getTargetPath(`.nitro/css-tree@${version}/data`),
          )
        }
        await copy(
          getSourcePath("mdn-data", "2.12.2"),
          getTargetPath("mdn-data"),
        )
      },
    },
  },

  vite: {
    plugins: [
      // Почему-то тут ошибка типов без as Plugin, скорее всего из-за разных версий vite.
      // TODO: Разобраться и пофиксить.
      vueCssModule({ attrName: "mclass", pugClassLiterals: true }) as Plugin,
    ],
  },

  css: [
    "~/styles/index.css",
  ],

  hooks: {
    "prepare:types": function ({ tsConfig, nodeTsConfig, sharedTsConfig }) {
      [tsConfig, nodeTsConfig, sharedTsConfig].forEach(fixTsConfig)
    },
  },

  sourcemap: {
    // Для Sentry.
    client: "hidden",
  },

  experimental: {
    typescriptPlugin: true,
  },

  //
  // Modules & config
  //

  modules: [
    "@nuxt/icon",
    "@nuxt/ui",
    "nuxt-auth-utils",
  ],

  router: {
    options: {
      sensitive: true,
    },
  },

  ui: {
    // Пока что выключил, т.к. иначе оно качает шрифты при запуске dev-сервера.
    // После подключения шрифтов, убрать это, добавить @nuxt/fonts в зависимости (чтобы подгрузились типы) и настроить нужный провайдер (желательно local).
    fonts: false,
  },

  //
  // Runtime config
  //

  runtimeConfig: {
    baseUrl: "https://nsu-abitur-bot.github.io/abitur-web/",
    session: {
      name: "abitur-session",
      // NUXT_SESSION_PASSWORD
      // Generate with: openssl rand -hex 32
      password: "",
      cookie: {
        // Разрешить авторизации работать в iframe (например в web.telegram.org)
        sameSite: "none",
      },
    },
    public: {
      // NUXT_PUBLIC_BASE_URL, без слеша на конце (пример: https://abitur.localhost)
      baseUrl: "",
    },
  },

  $development: {
    vite: {
      server: {
        // Для отладки колбеков через туннельные сервисы.
        allowedHosts: true,
      },
    },
    runtimeConfig: {
      public: {
        baseUrl: "https://abitur.localhost",
      },
    },
  },
})
