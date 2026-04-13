import { useStorage } from "@vueuse/core"
import { defineStore } from "pinia"

import { confirmRagUpload, parsePageForRag } from "~/services/rag-upload"
import type { CsvImportPreviewResult } from "~/types/rag-upload"

export interface PendingItem {
  url: string
  title: string
  text: string
  documents: any[]
  status: "idle" | "parsing" | "success" | "error" | "indexing" | "indexed" | "index_error"
  error?: string
}

const RAG_PARSER_URL_KEY = "rag-parser-url-v1"
const RAG_PARSER_PENDING_KEY = "rag-parser-pending-items-v1"
const RAG_PARSER_SELECTED_KEY = "rag-parser-selected-indices-v1"
const CONCURRENCY_LIMIT = 3

const isTransientRequestError = (err: unknown) => {
  const name = String((err as any)?.name ?? "").toLowerCase()
  const message = String((err as any)?.message ?? (err as any)?.data?.detail ?? "").toLowerCase()
  return name.includes("abort")
    || message.includes("abort")
    || message.includes("cancel")
    || message.includes("networkerror")
    || message.includes("failed to fetch")
    || message.includes("load failed")
}

export const useRagParserStore = defineStore("ragParser", () => {
  const url = useStorage<string>(RAG_PARSER_URL_KEY, "")
  const pendingItems = useStorage<PendingItem[]>(RAG_PARSER_PENDING_KEY, [])
  const selectedIndices = useStorage<number[]>(RAG_PARSER_SELECTED_KEY, [])

  const isUploading = ref(false)
  const isCsvUploading = ref(false)
  const isProcessingQueue = ref(false)
  const isInitialized = ref(false)
  const isUnloadHandlerBound = ref(false)

  const parsingStats = computed(() => {
    const items = pendingItems.value
    const total = items.length
    const done = items.filter(i => i.status !== "idle" && i.status !== "parsing").length
    return { total, done }
  })

  const indexingStats = computed(() => {
    const items = pendingItems.value.filter(i => i.status === "indexing" || i.status === "indexed" || i.status === "index_error")
    const total = items.length
    const done = items.filter(i => i.status === "indexed" || i.status === "index_error").length
    return { total, done }
  })

  const normalizeRestoredItems = () => {
    pendingItems.value = pendingItems.value.map((item) => {
      if (item.status === "parsing") {
        return { ...item, status: "idle", error: undefined }
      }
      if (item.status === "indexing") {
        return { ...item, status: "success", error: undefined }
      }
      if (item.status === "error" && isTransientRequestError({ message: item.error })) {
        return { ...item, status: "idle", error: undefined }
      }
      return item
    })
  }

  const moveParsingToIdle = () => {
    pendingItems.value = pendingItems.value.map(item => item.status === "parsing"
      ? { ...item, status: "idle", error: undefined }
      : item)
  }

  const sanitizeSelection = () => {
    const maxIndex = pendingItems.value.length - 1
    selectedIndices.value = selectedIndices.value.filter(index => Number.isInteger(index) && index >= 0 && index <= maxIndex)
  }

  const parseItem = async (index: number) => {
    const item = pendingItems.value[index]
    if (!item) {
      return
    }

    try {
      const res = await parsePageForRag(item.url)
      const current = pendingItems.value[index]
      if (!current) {
        return
      }

      current.title = res.title || current.title
      current.text = res.text || ""
      current.documents = res.documents || []
      current.status = "success"
      current.error = undefined
    } catch (err: any) {
      const current = pendingItems.value[index]
      if (!current) {
        return
      }

      if (isTransientRequestError(err)) {
        current.status = "idle"
        current.error = undefined
        return
      }

      current.status = "error"
      current.error = err?.data?.detail || "Ошибка препроцессинга"
    }
  }

  const processQueue = async () => {
    if (isProcessingQueue.value) {
      return
    }
    isProcessingQueue.value = true

    try {
      while (true) {
        const idleIndex = pendingItems.value.findIndex(item => item.status === "idle")
        if (idleIndex === -1) {
          break
        }

        const parsingCount = pendingItems.value.filter(item => item.status === "parsing").length
        if (parsingCount >= CONCURRENCY_LIMIT) {
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }

        const itemToStart = pendingItems.value[idleIndex]
        if (itemToStart) {
          itemToStart.status = "parsing"
          parseItem(idleIndex)
        }
      }
    } finally {
      isProcessingQueue.value = false
    }
  }

  const addUrlItem = (nextUrl: string) => {
    if (!nextUrl) {
      return
    }

    const index = pendingItems.value.length
    pendingItems.value.push({
      url: nextUrl,
      title: nextUrl,
      text: "",
      documents: [],
      status: "idle",
    })
    selectedIndices.value = [...selectedIndices.value, index]
    processQueue()
  }

  const addCsvItems = (results: CsvImportPreviewResult[]) => {
    for (const res of results) {
      const index = pendingItems.value.length
      pendingItems.value.push({
        url: res.url,
        title: res.title || res.url,
        text: "",
        documents: [],
        status: "idle",
      })
      selectedIndices.value = [...selectedIndices.value, index]
    }

    processQueue()
  }

  const toggleSelection = (index: number) => {
    if (selectedIndices.value.includes(index)) {
      selectedIndices.value = selectedIndices.value.filter(i => i !== index)
    } else {
      selectedIndices.value = [...selectedIndices.value, index]
    }
  }

  const toggleAll = () => {
    const validForSelection = pendingItems.value.map((item, i) =>
      (item.status !== "idle" && item.status !== "parsing" && item.status !== "indexing") ? i : -1,
    ).filter(i => i !== -1)

    const allSelected = validForSelection.length > 0
      && validForSelection.every(i => selectedIndices.value.includes(i))

    if (allSelected) {
      selectedIndices.value = []
    } else {
      selectedIndices.value = validForSelection
    }
  }

  const removeItem = (index: number) => {
    pendingItems.value.splice(index, 1)
    selectedIndices.value = selectedIndices.value
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i)
  }

  const confirmSelectedUpload = async () => {
    const itemsToUpload = selectedIndices.value
      .map(i => ({ index: i, item: pendingItems.value[i] }))
      .filter(({ item }) => !!item && item.status === "success" && !item.error)

    if (itemsToUpload.length === 0) {
      return { successCount: 0, totalCount: 0 }
    }

    isUploading.value = true
    let successCount = 0

    try {
      for (const { index } of itemsToUpload) {
        const current = pendingItems.value[index]
        if (!current) {
          continue
        }

        current.status = "indexing"
        try {
          await confirmRagUpload({
            title: current.title,
            url: current.url,
            text: current.text,
            documents: [],
          })
          current.status = "indexed"
          current.error = undefined
          successCount++
        } catch (err: any) {
          current.status = "index_error"
          current.error = err?.data?.detail || "Ошибка загрузки в RAG"
        }
      }

      return {
        successCount,
        totalCount: itemsToUpload.length,
      }
    } finally {
      isUploading.value = false
    }
  }

  const cleanupIndexedItems = () => {
    const indexedItems = new Set<number>()
    pendingItems.value.forEach((item, index) => {
      if (item.status === "indexed") {
        indexedItems.add(index)
      }
    })

    pendingItems.value = pendingItems.value.filter((_, index) => !indexedItems.has(index))

    const newSelected: number[] = []
    let shiftCount = 0
    for (let i = 0; i < pendingItems.value.length + indexedItems.size; i++) {
      if (indexedItems.has(i)) {
        shiftCount++
      } else if (selectedIndices.value.includes(i)) {
        newSelected.push(i - shiftCount)
      }
    }
    selectedIndices.value = newSelected
  }

  const init = () => {
    if (isInitialized.value) {
      return
    }
    isInitialized.value = true

    normalizeRestoredItems()
    sanitizeSelection()

    if (import.meta.client && !isUnloadHandlerBound.value) {
      isUnloadHandlerBound.value = true
      window.addEventListener("beforeunload", moveParsingToIdle)
      window.addEventListener("pagehide", moveParsingToIdle)
    }

    if (pendingItems.value.some(item => item.status === "idle")) {
      processQueue()
    }
  }

  return {
    addCsvItems,
    addUrlItem,
    cleanupIndexedItems,
    confirmSelectedUpload,
    indexingStats,
    init,
    isCsvUploading,
    isProcessingQueue,
    isUploading,
    parsingStats,
    pendingItems,
    processQueue,
    removeItem,
    selectedIndices,
    toggleAll,
    toggleSelection,
    url,
  }
})
