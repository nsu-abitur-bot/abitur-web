import { defineEventHandler } from "h3"

export default defineEventHandler(() => {
  const generateConsistentId = (i: number) => {
    return `${4000000 + ((i + 1) * 374821) % 1000000}`
  }

  const generateTable = (count: number, startIdIndex: number) => {
    return Array.from({ length: count }, (_, i) => {
      const idx = startIdIndex + i
      const math = 60 + Math.floor(Math.random() * 41)
      const informatics = 60 + Math.floor(Math.random() * 41)
      const russian = 60 + Math.floor(Math.random() * 41)
      const ind = Math.floor(Math.random() * 11)
      const total = math + informatics + russian + ind

      return {
        number: `${i + 1}`,
        type: "результаты ЕГЭ",
        controlPassed: "Да",
        disciplines: [
          { name: "Высшая математика / Математика", point: `${math}` },
          { name: "Компьютерные науки / Физические основы информатики / Информатика и ИКТ / Физика", point: `${informatics}` },
          { name: "Русский язык", point: `${russian}` },
        ],
        sumPointDiscipline: `${math + informatics + russian}`,
        sumPointAchievement: `${ind}`,
        sumPointTotal: `${total}`,
        code: generateConsistentId(idx),
        priority: `${1 + (idx % 5)}`,
        original: "",
        consent: Math.random() > 0.5 ? "Да" : "Нет",
        hostel: Math.random() > 0.5 ? "Да" : "Нет",
        status: "Подано",
        personalNumber: `123-450-164 ${idx % 99}`,
        enlisted: "",
        without_entrance_tests: "",
        originalNSU: "",
        originalIS: "",
        originalE: "",
        originalEPGU: "",
        codeEGPU: generateConsistentId(idx),
        isMainTopPriority: "",
        name: generateConsistentId(idx),
      }
    })
  }

  return {
    filter: {
      faculty: 8,
      direction: 7,
      condition: 10,
      type: 0,
    },
    title: "",
    faculty: {
      id: 8,
      name: "Факультет информационных технологий",
      url: "",
    },
    info: {
      coloring: true,
      places: {
        summ: {
          "в рамках целевой квоты": 0,
          "в рамках отдельной квоты": 5,
          "в рамках особой квоты": 2,
          "БВИ": 10,
        },
        total: {
          value: 48,
          description: "",
        },
        budget_basis: {
          value: 10,
        },
        credit: {
          value: 48,
        },
        enroll: {
          value: 0,
        },
      },
      date: "28.08.2025 16:10:26",
      countApplications: 91,
      topPriorities: 74,
      fields: {
        number: "#",
        status: " ",
        name: "Уникальный код поступающего",
        sumPointAchievement: "Сумма баллов за инд.дост.",
        sumPointTotal: "Сумма баллов",
        consent: "Согласие на зачисление",
        isMainTopPriority: "Основной высший приоритет",
        priority: "Номер приоритета",
        recommendations: "Рекомендации к зачислению",
      },
      countFields: 9,
    },
    items: [
      {
        title: "целевой приём",
        condition: "40",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) целевой приём",
        info: {
          date: "25.08.2025 15:41:53",
          speciality: {
            name: "Информатика и вычислительная техника",
            finance: "Целевой прием",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) целевой приём",
          },
          condition: "",
          place: {
            total: { value: 0, description: "Всего мест: 0." },
            budget_basis: { value: 0, description: null },
            credit: { value: 0, description: null },
            enroll: { value: 0, description: null },
          },
          freePlaces: 0,
        },
        table: [],
        direction_id: "242",
        condition_order: "1",
      },
      {
        title: "отдельная квота",
        condition: "10",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) отдельная квота",
        info: {
          date: "25.08.2025 15:42:04",
          speciality: {
            name: "Информатика и вычислительная техника",
            finance: "Бюджетная основа",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) отдельная квота",
          },
          condition: "",
          place: {
            total: { value: 5, description: "Всего мест: 5." },
            budget_basis: { value: 0, description: null },
            credit: { value: 5, description: null },
            enroll: { value: 0, description: null },
          },
          freePlaces: 0,
        },
        table: generateTable(5, 0).map(t => ({ ...t, status: "Зачислен", enlisted: "1" })),
        direction_id: "240",
        condition_order: "3",
      },
      {
        title: "особая квота",
        condition: "20",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) особая квота",
        info: {
          date: "25.08.2025 15:41:05",
          speciality: {
            name: "Информатика и вычислительная техника",
            finance: "Бюджетная основа",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) особая квота",
          },
          condition: "",
          place: {
            total: { value: 2, description: "Всего мест: 2." },
            budget_basis: { value: 0, description: null },
            credit: { value: 2, description: null },
            enroll: { value: 0, description: null },
          },
          freePlaces: 0,
        },
        table: generateTable(7, 5),
        direction_id: "241",
        condition_order: "2",
      },
      {
        title: "основной конкурс",
        condition: "0",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) основной конкурс",
        info: {
          date: "25.08.2025 15:40:00",
          speciality: {
            name: "Информатика и вычислительная техника",
            finance: "Бюджетная основа",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) основной конкурс",
          },
          condition: "",
          place: {
            total: { value: 31, description: "Всего мест: 31." },
            budget_basis: { value: 0, description: null },
            credit: { value: 31, description: null },
            enroll: { value: 0, description: null },
          },
          freePlaces: 0,
        },
        table: generateTable(79, 12),
        direction_id: "243",
        condition_order: "4",
      },
    ],
  }
})
