<script setup lang="ts">
import { authErrorMessage } from "~/services/auth-errors"

definePageMeta({
  layout: false,
})

const toast = useToast()

const username = ref("")
const password = ref("")
const inviteCode = ref("")
const isLoading = ref(false)
const errorMessage = ref("")

const handleRegister = async () => {
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
    const message = authErrorMessage(error, "Не удалось выполнить регистрацию")
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
div(class="min-h-screen bg-[var(--ui-bg-muted)] flex items-center justify-center px-4 py-10")
  div(class="w-full max-w-md")
    div(class="bg-[var(--ui-bg)] border border-[var(--ui-border)] rounded-xl p-6 sm:p-8 space-y-6")
      div(class="space-y-2")
        p(class="text-sm font-semibold text-primary") Абитуриент · Администрирование
        h1(class="text-xl font-semibold text-gray-900 dark:text-gray-100") Регистрация
        p(class="text-sm text-muted") Создайте аккаунт по приглашению администратора.

      form(class="space-y-4" @submit.prevent="handleRegister")
        u-form-field(label="Логин" required)
          u-input(
            v-model="username"
            autocomplete="username"
            icon="i-heroicons-user"
            placeholder="Придумайте логин"
            size="md" class="w-full"
            :disabled="isLoading"
          )

        u-form-field(label="Пароль" required)
          u-input(
            v-model="password"
            type="password"
            autocomplete="new-password"
            icon="i-heroicons-lock-closed"
            placeholder="Придумайте пароль"
            size="md" class="w-full"
            :disabled="isLoading"
          )

        u-form-field(label="Инвайт-код")
          u-input(
            v-model="inviteCode"
            icon="i-heroicons-key"
            placeholder="Введите инвайт-код (если есть)"
            size="md" class="w-full"
            :disabled="isLoading"
          )

        p(v-if="errorMessage" role="alert" class="text-sm text-error") {{ errorMessage }}

        u-button(type="submit" color="primary" block size="md" class="w-full" :loading="isLoading")
          | Зарегистрироваться

      div(class="text-center text-sm text-gray-500")
        | Уже есть аккаунт?
        |
        nuxt-link(to="/login" class="text-primary hover:underline") Войти
</template>
