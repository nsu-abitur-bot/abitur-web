import { defineEventHandler } from "h3"

type Discipline = {
  name: string
  point: string
}

type Entrant = {
  code: string
  codeEGPU: string
  consent: "Да" | "Нет"
  controlPassed: "Да"
  disciplines: Discipline[]
  enlisted: "" | "1"
  hostel: "Да" | "Нет"
  isMainTopPriority: ""
  name: string
  number: string
  original: ""
  originalE: ""
  originalEPGU: ""
  originalIS: ""
  originalNSU: ""
  personalNumber: string
  priority: string
  status: "Подано" | "Зачислен"
  sumPointAchievement: string
  sumPointDiscipline: string
  sumPointTotal: string
  type: "результаты ЕГЭ"
  without_entrance_tests: ""
}

type RatingCategory = {
  condition: string
  condition_order: string
  direction_id: string
  group_competitive: string
  info: {
    condition: string
    date: string
    freePlaces: number
    place: {
      budget_basis: { description: null, value: number }
      credit: { description: null, value: number }
      enroll: { description: null, value: number }
      total: { description: string, value: number }
    }
    speciality: {
      finance: string
      group: string
      name: string
    }
  }
  table: Entrant[]
  title: string
}

type RatingData = {
  faculty: {
    id: number
    name: string
    url: string
  }
  filter: {
    condition: number
    direction: number
    faculty: number
    type: number
  }
  info: {
    coloring: boolean
    countApplications: number
    countFields: number
    date: string
    fields: Record<string, string>
    places: {
      budget_basis: { value: number }
      credit: { value: number }
      enroll: { value: number }
      summ: Record<string, number>
      total: { description: string, value: number }
    }
    topPriorities: number
  }
  items: RatingCategory[]
  title: string
}

type RawEntrant = {
  idx: number
  ind: number
  informatics: number
  math: number
  russian: number
  total: number
}

let cachedData: RatingData | null = null
let lastUpdate = 0

const generateConsistentId = (i: number) => {
  return `${4000000 + (((i + 1) * 374821) % 1000000)}`
}

const generateTable = (count: number, startIdIndex: number): Entrant[] => {
  const rawEntrants: RawEntrant[] = Array.from({ length: count }, (_, i) => {
    const idx = startIdIndex + i
    const math = 60 + Math.floor(Math.random() * 41)
    const informatics = 60 + Math.floor(Math.random() * 41)
    const russian = 60 + Math.floor(Math.random() * 41)
    const ind = Math.floor(Math.random() * 11)
    const total = math + informatics + russian + ind

    return {
      idx,
      ind,
      informatics,
      math,
      russian,
      total,
    }
  })

  return rawEntrants
    .sort((a, b) => b.total - a.total)
    .map((entrant, index) => {
      const id = generateConsistentId(entrant.idx)

      return {
        code: id,
        codeEGPU: id,
        consent: Math.random() > 0.5 ? "Да" : "Нет",
        controlPassed: "Да",
        disciplines: [
          { name: "Высшая математика / Математика", point: `${entrant.math}` },
          {
            name: "Компьютерные науки / Физические основы информатики / Информатика и ИКТ / Физика",
            point: `${entrant.informatics}`,
          },
          { name: "Русский язык", point: `${entrant.russian}` },
        ],
        enlisted: "",
        hostel: Math.random() > 0.5 ? "Да" : "Нет",
        isMainTopPriority: "",
        name: id,
        number: `${index + 1}`,
        original: "",
        originalE: "",
        originalEPGU: "",
        originalIS: "",
        originalNSU: "",
        personalNumber: `123-450-164 ${entrant.idx % 99}`,
        priority: `${1 + (entrant.idx % 5)}`,
        status: "Подано",
        sumPointAchievement: `${entrant.ind}`,
        sumPointDiscipline: `${entrant.math + entrant.informatics + entrant.russian}`,
        sumPointTotal: `${entrant.total}`,
        type: "результаты ЕГЭ",
        without_entrance_tests: "",
      }
    })
}

const createRatingData = (): RatingData => {
  return {
    faculty: {
      id: 8,
      name: "Факультет информационных технологий",
      url: "",
    },
    filter: {
      condition: 10,
      direction: 7,
      faculty: 8,
      type: 0,
    },
    info: {
      coloring: true,
      countApplications: 91,
      countFields: 9,
      date: new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        year: "numeric",
      }),
      fields: {
        consent: "Согласие на зачисление",
        isMainTopPriority: "Основной высший приоритет",
        name: "Уникальный код поступающего",
        number: "#",
        priority: "Номер приоритета",
        recommendations: "Рекомендации к зачислению",
        status: " ",
        sumPointAchievement: "Сумма баллов за инд.дост.",
        sumPointTotal: "Сумма баллов",
      },
      places: {
        budget_basis: {
          value: 10,
        },
        credit: {
          value: 48,
        },
        enroll: {
          value: 0,
        },
        summ: {
          "БВИ": 10,
          "в рамках отдельной квоты": 5,
          "в рамках особой квоты": 2,
          "в рамках целевой квоты": 0,
        },
        total: {
          description: "",
          value: 48,
        },
      },
      topPriorities: 74,
    },
    items: [
      {
        condition: "40",
        condition_order: "1",
        direction_id: "242",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) целевой приём",
        info: {
          condition: "",
          date: "25.08.2025 15:41:53",
          freePlaces: 0,
          place: {
            budget_basis: { description: null, value: 0 },
            credit: { description: null, value: 0 },
            enroll: { description: null, value: 0 },
            total: { description: "Всего мест: 0.", value: 0 },
          },
          speciality: {
            finance: "Целевой прием",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) целевой приём",
            name: "Информатика и вычислительная техника",
          },
        },
        table: [],
        title: "целевой приём",
      },
      {
        condition: "10",
        condition_order: "3",
        direction_id: "240",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) отдельная квота",
        info: {
          condition: "",
          date: "25.08.2025 15:42:04",
          freePlaces: 0,
          place: {
            budget_basis: { description: null, value: 0 },
            credit: { description: null, value: 5 },
            enroll: { description: null, value: 0 },
            total: { description: "Всего мест: 5.", value: 5 },
          },
          speciality: {
            finance: "Бюджетная основа",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) отдельная квота",
            name: "Информатика и вычислительная техника",
          },
        },
        table: generateTable(5, 0).map(entrant => ({ ...entrant, enlisted: "1", status: "Зачислен" })),
        title: "отдельная квота",
      },
      {
        condition: "20",
        condition_order: "2",
        direction_id: "241",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) особая квота",
        info: {
          condition: "",
          date: "25.08.2025 15:41:05",
          freePlaces: 0,
          place: {
            budget_basis: { description: null, value: 0 },
            credit: { description: null, value: 2 },
            enroll: { description: null, value: 0 },
            total: { description: "Всего мест: 2.", value: 2 },
          },
          speciality: {
            finance: "Бюджетная основа",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) особая квота",
            name: "Информатика и вычислительная техника",
          },
        },
        table: generateTable(7, 5),
        title: "особая квота",
      },
      {
        condition: "0",
        condition_order: "4",
        direction_id: "243",
        group_competitive: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) основной конкурс",
        info: {
          condition: "",
          date: "25.08.2025 15:40:00",
          freePlaces: 0,
          place: {
            budget_basis: { description: null, value: 0 },
            credit: { description: null, value: 31 },
            enroll: { description: null, value: 0 },
            total: { description: "Всего мест: 31.", value: 31 },
          },
          speciality: {
            finance: "Бюджетная основа",
            group: "Информатика и ВТ. Компьютерные науки и системотехника (09.03.01) основной конкурс",
            name: "Информатика и вычислительная техника",
          },
        },
        table: generateTable(79, 12),
        title: "основной конкурс",
      },
    ],
    title: "",
  }
}

export default defineEventHandler(() => {
  const now = Date.now()
  if (cachedData && now - lastUpdate < 20000) {
    return cachedData
  }

  const generatedData = createRatingData()

  cachedData = generatedData
  lastUpdate = now
  return generatedData
})
