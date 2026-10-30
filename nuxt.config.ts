import process from "node:process"
import { fileURLToPath } from "node:url"

import type { VueTSConfig } from "nuxt/schema"

function fixTsConfig(tsConfig: VueTSConfig) {
  // убрать лишние стандартные алиасы, чтобы остался ровно один ~, который и будем использовать
  for (const p of ["~~", "@@", "@"]) {
    const paths = tsConfig.compilerOptions?.paths
    if (paths) {
      delete paths[p]
      delete paths[p + "/*"]
    }
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
    "#openapi": fileURLToPath(new URL("./types/openapi", import.meta.url)),
  },

  app: {
    baseURL: "/",
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
    },
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
    "@pinia/nuxt",
    "nuxt-open-fetch",
  ],

  openFetch: {
    clients: {
      myApi: {
        schema: "./openapi.json",
        baseURL: "/",
      },
    },
  },

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

  icon: {
    provider: "none",
    serverBundle: false,
    fallbackToApi: false,
    clientBundle: {
      scan: {
        globInclude: [
          "app/**/*.{vue,ts}",
          "node_modules/@nuxt/ui/dist/**/*.{js,mjs,vue}",
        ],
        globExclude: ["dist", "build", "coverage", "test", "tests", ".*"],
      },
    },
  },

  //
  // Runtime config
  //

  runtimeConfig: {
    serviceToken: "", // NUXT_SERVICE_TOKEN
    database: {
      url: "", // NUXT_DATABASE_URL
      log: false,
    },
    session: {
      name: "abitur-session",
      // NUXT_SESSION_PASSWORD
      // Generate with: openssl rand -hex 32
      password: "",
      cookie: {
        sameSite: "lax",
        secure: false,
      },
    },
    public: {
      // NUXT_PUBLIC_BASE_URL, без слеша на конце (пример: https://abitur.localhost)
      baseUrl: "",
      // NUXT_PUBLIC_API_BASE_URL, без слеша на конце (пример: http://localhost:8000)
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    },
  },

  $development: {
    vite: {
      server: {
        // Для отладки колбеков через туннельные сервисы.
        allowedHosts: true,
        proxy: {
          "/api/v1": {
            target: process.env.NUXT_PUBLIC_API_BASE_URL || "http://10.5.10.190:8000",
            changeOrigin: true,
          },
        },
      },
    },
    runtimeConfig: {
      public: {
        baseUrl: "https://abitur.localhost",
        apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "http://10.5.10.190:8000",
      },
    },
  },
})
