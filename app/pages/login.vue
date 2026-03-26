<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { fetch: fetchSession, loggedIn } = useUserSession()
const toast = useToast()

const login = ref("")
const password = ref("")
const isLoading = ref(false)
const errorMessage = ref("")

const getReadableErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || !error) {
    return "Не удалось выполнить вход"
  }

  const maybeError = error as {
    data?: { message?: string, statusMessage?: string }
    statusMessage?: string
    message?: string
  }

  const message = maybeError.data?.message
    ?? maybeError.data?.statusMessage
    ?? maybeError.statusMessage

  if (message) {
    return message
  }

  return maybeError.message && !maybeError.message.startsWith("[")
    ? maybeError.message
    : "Не удалось выполнить вход"
}

if (loggedIn.value) {
  await navigateTo("/")
}

const handleLogin = async () => {
  if (!login.value || !password.value) {
    errorMessage.value = "Введите логин и пароль"
    return
  }

  isLoading.value = true
  errorMessage.value = ""

  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        login: login.value,
        password: password.value,
      },
    })

    // Обновляем состояние сессии на клиенте после установки cookie.
    await fetchSession()
    await navigateTo("/")
  } catch (error: unknown) {
    const message = getReadableErrorMessage(error)
    errorMessage.value = message
    toast.add({
      title: "Ошибка входа",
      description: message,
      color: "error",
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template lang="pug">
div(class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4")
  div(class="w-full max-w-md")
    div(class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6")
      div(class="space-y-2")
        p(class="text-xs uppercase tracking-[0.18em] text-primary") АБИТУРИЕНТ.РФ
        h1(class="text-2xl font-bold text-gray-900 dark:text-gray-100") Вход в систему
        p(class="text-sm text-gray-500 dark:text-gray-400")
          | При первом входе будут сохранены введенные логин и пароль.

      form(class="space-y-4" @submit.prevent="handleLogin")
        u-form-field(label="Логин" required)
          u-input(
            v-model="login"
            autocomplete="username"
            icon="i-heroicons-user"
            placeholder="Введите логин"
            size="xl"
            :disabled="isLoading"
          )

        u-form-field(label="Пароль" required)
          u-input(
            v-model="password"
            type="password"
            autocomplete="current-password"
            icon="i-heroicons-lock-closed"
            placeholder="Введите пароль"
            size="xl"
            :disabled="isLoading"
            @keyup.enter="handleLogin"
          )

        p(v-if="errorMessage" class="text-sm text-error") {{ errorMessage }}

        u-button(type="submit" color="primary" block size="xl" :loading="isLoading")
          | Войти
</template>
