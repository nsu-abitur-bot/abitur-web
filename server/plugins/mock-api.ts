export default defineNitroPlugin((nitroApp) => {
  // Mock Data
  const mockMessages = [
    {
      id: "msg-1",
      user_id: 101,
      session_id: "sess-abc",
      user_text: "Привет, когда начинаются экзамены?",
      bot_response: "Здравствуйте! Вступительные экзамены начинаются 15 июля. Подробное расписание доступно на сайте.",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "msg-2",
      user_id: 102,
      session_id: "sess-xyz",
      user_text: "Нужно ли сдавать оригинал аттестата?",
      bot_response: "Оригинал аттестата обязателен для зачисления на бюджет. Вы можете подать его до 3 августа.",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: "msg-3",
      user_id: 101,
      session_id: "sess-abc",
      user_text: "А где можно посмотреть списки поступивших?",
      bot_response: "Списки рекомендованных к зачислению публикуются на сайте 5 августа.",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ]

  const mockFaqs = [
    {
      question: "Как подать документы?",
      aliases: ["как поступить", "подача документов"],
      answer: "Подать документы можно через Госуслуги или лично в приемной комиссии.",
    },
    {
      question: "Где находится приемная комиссия?",
      aliases: ["адрес комиссии", "куда нести доки"],
      answer: "Приемная комиссия находится в Главном корпусе, кабинет 101.",
    },
  ]

  const mockStats = {
    day: 12,
    week: 85,
    month: 340,
    year: 1560,
    all_time: 4890,
  }

  // Intercept requests for mocking in dev
  nitroApp.hooks.hook("request", (event) => {
    const url = new URL(event.node.req.url || "/", "http://localhost")

    // Mock user stats
    if (url.pathname === "/api/v1/users/count-stats" && event.node.req.method === "GET") {
      return event.respondWith(new Response(JSON.stringify(mockStats), {
        headers: { "Content-Type": "application/json" },
      }))
    }

    // Mock GET FAQ list
    if (url.pathname === "/api/v1/faq" && event.node.req.method === "GET") {
      return event.respondWith(new Response(JSON.stringify({ items: mockFaqs }), {
        headers: { "Content-Type": "application/json" },
      }))
    }

    // MOCK POST FAQ (Create)
    if (url.pathname === "/api/v1/faq" && event.node.req.method === "POST") {
      return event.respondWith(new Response(JSON.stringify({
        question: "Новый вопрос",
        aliases: [],
        answer: "Новый ответ",
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }))
    }

    // MOCK PUT FAQ (Update)
    if (url.pathname.match(/^\/api\/v1\/faq\/\d+$/) && event.node.req.method === "PUT") {
      return event.respondWith(new Response(JSON.stringify({
        question: "Обновленный вопрос",
        aliases: [],
        answer: "Обновленный ответ",
      }), {
        headers: { "Content-Type": "application/json" },
      }))
    }

    // MOCK DELETE FAQ
    if (url.pathname.match(/^\/api\/v1\/faq\/\d+$/) && event.node.req.method === "DELETE") {
      return event.respondWith(new Response(null, {
        status: 204,
      }))
    }

    // Mock GET Messages
    if (url.pathname === "/api/v1/messages" && event.node.req.method === "GET") {
      return event.respondWith(new Response(JSON.stringify(mockMessages), {
        headers: { "Content-Type": "application/json" },
      }))
    }
  })
})
