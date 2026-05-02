<script setup lang="ts">
definePageMeta({
  layout: false,
})

const token = useAuthToken()
const toast = useToast()

const username = ref("")
const password = ref("")
const inviteCode = ref("")
const isLoading = ref(false)
const errorMessage = ref("")

const getReadableErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || !error) {
    return "Не удалось выполнить регистрацию"
  }

  const maybeError = error as {
    data?: { message?: string, statusMessage?: string, detail?: string }
    statusMessage?: string
    message?: string
  }

  const message = maybeError.data?.message
    ?? maybeError.data?.statusMessage
    ?? (typeof maybeError.data?.detail === "string" ? maybeError.data.detail : undefined)
    ?? maybeError.statusMessage

  if (message) {
    return message
  }

  return maybeError.message && !maybeError.message.startsWith("[")
    ? maybeError.message
    : "Не удалось выполнить регистрацию"
}

if (token.value) {
  await navigateTo("/")
}

const handleRegister = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = "Введите логин и пароль"
    return
  }

  isLoading.value = true
  errorMessage.value = ""

  try {
    await $fetch("/api/v1/auth/register", {
      baseURL: useApiBaseUrl(),
      method: "POST",
      body: {
        username: username.value,
        password: password.value,
        invite_code: inviteCode.value || undefined,
      },
    })

    toast.add({
      title: "Успешно",
      description: "Аккаунт создан. Войдите в систему.",
      color: "success",
    })
    await navigateTo("/login")
  } catch (error: unknown) {
    const message = getReadableErrorMessage(error)
    errorMessage.value = message
    toast.add({
      title: "Ошибка регистрации",
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
        h1(class="text-2xl font-bold text-gray-900 dark:text-gray-100") Регистрация

      form(class="space-y-4" @submit.prevent="handleRegister")
        u-form-field(label="Логин" required)
          u-input(
            v-model="username"
            autocomplete="username"
            icon="i-heroicons-user"
            placeholder="Придумайте логин"
            size="xl"
            :disabled="isLoading"
          )

        u-form-field(label="Пароль" required)
          u-input(
            v-model="password"
            type="password"
            autocomplete="new-password"
            icon="i-heroicons-lock-closed"
            placeholder="Придумайте пароль"
            size="xl"
            :disabled="isLoading"
          )

        u-form-field(label="Инвайт-код")
          u-input(
            v-model="inviteCode"
            icon="i-heroicons-key"
            placeholder="Введите инвайт-код (если есть)"
            size="xl"
            :disabled="isLoading"
          )

        p(v-if="errorMessage" class="text-sm text-error") {{ errorMessage }}

        u-button(type="submit" color="primary" block size="xl" :loading="isLoading")
          | Зарегистрироваться

      div(class="text-center text-sm text-gray-500")
        | Уже есть аккаунт?
        |
        nuxt-link(to="/login" class="text-primary hover:underline") Войти
</template>
