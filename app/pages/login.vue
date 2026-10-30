<script setup lang="ts">
import { authErrorMessage } from "~/services/auth-errors"

definePageMeta({
  layout: false,
})

const token = useAuthToken()
const toast = useToast()

const username = ref("")
const password = ref("")
const isLoading = ref(false)
const errorMessage = ref("")

const handleLogin = async () => {
  if (isLoading.value) {
    return
  }
  if (!username.value || !password.value) {
    errorMessage.value = "Введите логин и пароль"
    return
  }

  isLoading.value = true
  errorMessage.value = ""

  try {
    const response = await $fetch<{ access_token: string, token_type: string }>(
      "/api/v1/auth/login",
      {
        baseURL: useApiBaseUrl(),
        method: "POST",
        body: {
          username: username.value,
          password: password.value,
        },
      },
    )

    token.value = response.access_token
    await navigateTo("/")
  } catch (error: unknown) {
    const message = authErrorMessage(error, "Не удалось выполнить вход")
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
div(class="min-h-screen bg-[var(--ui-bg-muted)] flex items-center justify-center px-4 py-10")
  div(class="w-full max-w-md")
    div(class="bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-xl p-6 sm:p-8 space-y-6")
      div(class="space-y-2")
        p(class="text-sm font-semibold text-primary") Абитуриент · Администрирование
        h1(class="text-xl font-semibold text-gray-900 dark:text-gray-100") Вход в систему

      form(class="space-y-4" @submit.prevent="handleLogin")
        u-form-field(label="Логин" required)
          u-input(
            v-model="username"
            autocomplete="username"
            icon="i-heroicons-user"
            placeholder="Введите логин"
            size="md" class="w-full"
            :disabled="isLoading"
          )

        u-form-field(label="Пароль" required)
          u-input(
            v-model="password"
            type="password"
            autocomplete="current-password"
            icon="i-heroicons-lock-closed"
            placeholder="Введите пароль"
            size="md" class="w-full"
            :disabled="isLoading"
          )

        p(v-if="errorMessage" role="alert" class="text-sm text-error") {{ errorMessage }}

        u-button(type="submit" color="primary" block size="md" class="w-full" :loading="isLoading")
          | Войти

      div(class="text-center text-sm text-gray-500")
        | Нет аккаунта?
        |
        nuxt-link(to="/register" class="text-primary hover:underline") Зарегистрироваться
</template>
