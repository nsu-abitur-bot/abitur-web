<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"

definePageMeta({
  layout: false,
})

interface Entrant {
  id: string
  priority: number
  higherPriority: string
  totalScore: number
  consent: string
  recommendation: string
  disciplines: { name: string, score: number }[]
  indAchievements: number
  bvi: string
}

const lastUpdated = ref(new Date().toLocaleString("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
}))

const entrants = ref<Entrant[]>([])

const generateEntrants = () => {
  const result: Entrant[] = []
  for (let i = 0; i < 91; i++) {
    const math = 60 + Math.floor(Math.random() * 41)
    const informatics = 60 + Math.floor(Math.random() * 41)
    const russian = 60 + Math.floor(Math.random() * 41)
    const ind = Math.floor(Math.random() * 11)
    // Generate a consistent 7-digit ID based on the index to remain identical across reloads
    const consistentId = 4000000 + ((i + 1) * 374821) % 1000000

    result.push({
      id: `${consistentId}`,
      priority: 1 + Math.floor(Math.random() * 5),
      higherPriority: Math.random() > 0.8 ? "Да" : "Нет",
      totalScore: math + informatics + russian + ind,
      consent: Math.random() > 0.5 ? "Да" : "Нет",
      recommendation: "",
      disciplines: [
        { name: "Высшая математика / Математика", score: math },
        { name: "Компьютерные науки / Физические основы информатики / Информатика и ИКТ / Физика", score: informatics },
        { name: "Русский язык", score: russian },
      ],
      indAchievements: ind,
      bvi: "Нет",
    })
  }
  return result.sort((a, b) => b.totalScore - a.totalScore)
}

const updateScores = () => {
  entrants.value = entrants.value.map((e) => {
    if (Math.random() > 0.5) {
      const diff = Math.random() > 0.5 ? 2 : -2
      const math = Math.max(60, Math.min(100, e.disciplines[0].score + diff))
      const informatics = Math.max(60, Math.min(100, e.disciplines[1].score + diff))
      const russian = Math.max(60, Math.min(100, e.disciplines[2].score + diff))
      return {
        ...e,
        disciplines: [
          { name: e.disciplines[0].name, score: math },
          { name: e.disciplines[1].name, score: informatics },
          { name: e.disciplines[2].name, score: russian },
        ],
        totalScore: math + informatics + russian + e.indAchievements,
      }
    }
    return e
  }).sort((a, b) => b.totalScore - a.totalScore)

  lastUpdated.value = new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

let interval: any = null
onMounted(() => {
  entrants.value = generateEntrants()
  interval = setInterval(updateScores, 60000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

const expandedId = ref<string | null>(null)
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div class="nsu-mock-page">
    <Head>
      <Title>Бакалавриат, специалитет - Мок Рейтинг</Title>
      <Link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,600,700,800&display=swap" />
      <Link rel="stylesheet" href="/nsu/bootstrap.css" />
      <Link rel="stylesheet" href="/nsu/all.min.css" />
      <Link rel="stylesheet" href="/nsu/vue-select.css" />
      <Link rel="stylesheet" href="/nsu/stylesheet.css" />
      <Link rel="stylesheet" href="/nsu/loading.css" />
      <Link rel="stylesheet" href="/nsu/list-collapse.css" />
      <Link rel="stylesheet" href="/nsu/style.css" />
      <Link rel="stylesheet" href="/nsu/icon.css" />
    </Head>

    <div id="app" class="wrapper page-site background">
      <header>
        <div class="container">
          <div id="logo">
            <a href="#" class="logo-link">
              <img src="/nsu/logo-green.svg" alt="NSU Logo">
            </a>
          </div>
          <div class="header-actions">
            <div id="how-use">
              <a href="#" class="link hide-sm">Как пользоваться сервисом</a>
            </div>
            <div id="how-enrollment">
              <a href="#" class="link hide-sm">Как проходит зачисление</a>
            </div>
          </div>
          <div id="degree">
            <div class="dropdown">
              <span>Бакалавриат, специалитет</span>
              <i class="icon icon-arrow-down"></i>
            </div>
          </div>
        </div>
      </header>

      <section class="top-background">
        <div id="content-block" class="container">
          <div class="top_of_page">
            <h1><span>Списки</span> <span>абитуриентов</span></h1>

            <div class="hide-sm">
              <div class="filter-block filter-form">
                <form name="filterForm" onsubmit="return false;">
                  <div class="display-sm">
                    <div dir="auto" class="v-select vs--single vs--unsearchable">
                      <div class="vs__dropdown-toggle">
                        <div class="vs__selected-options">
                          <span class="vs__selected">Бакалавриат, специалитет</span>
                        </div>
                        <div class="vs__actions">
                          <span class="icon icon-arrow-down vs__open-indicator" role="presentation"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div dir="auto" class="v-select vs--single vs--unsearchable">
                      <div class="vs__dropdown-toggle">
                        <div class="vs__selected-options">
                          <span class="vs__selected">Факультет информационных технологий</span>
                        </div>
                        <div class="vs__actions">
                          <span class="icon icon-arrow-down vs__open-indicator" role="presentation"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div dir="auto" class="v-select vs--single vs--unsearchable">
                      <div class="vs__dropdown-toggle">
                        <div class="vs__selected-options">
                          <span class="vs__selected">Информатика и ВТ. Компьютерные науки и системотехника (09.03.01)</span>
                        </div>
                        <div class="vs__actions">
                          <span class="icon icon-arrow-down vs__open-indicator" role="presentation"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div dir="auto" class="v-select vs--single vs--unsearchable">
                      <div class="vs__dropdown-toggle">
                        <div class="vs__selected-options">
                          <span class="vs__selected">Бюджет</span>
                        </div>
                        <div class="vs__actions">
                          <span class="icon icon-arrow-down vs__open-indicator" role="presentation"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="buttons">
                    <button type="submit" class="btn btn-primary">
                      СФОРМИРОВАТЬ <i class="icon icon-arrow-right-white"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div class="content">
            <div class="data-content">
              <div class="meta">
                <div class="content">
                  <div class="info">
                    <div class="faculty"><span>Факультет информационных технологий</span></div>
                    <div class="info-places">
                      <p><span>Количество бюджетных мест по всем условиям поступления <b>48</b>. Зачислено</span>:</p>
                      <ul>
                        <li>в рамках целевой квоты - <b>0</b></li>
                        <li>в рамках отдельной квоты - <b>5</b></li>
                        <li>в рамках особой квоты - <b>2</b></li>
                        <li>БВИ - <b>10</b></li>
                      </ul>
                      <p>Всего зачислено: <b>48</b>. К зачислению: <b>0</b>.</p>
                    </div>
                    <div class="info-date">
                      <p>Время последнего обновления рейтингового списка: {{ lastUpdated }}</p>
                    </div>
                  </div>
                </div>
                <div class="statistic-blocks">
                  <div class="statistic-block display-sm">
                    <div class="num">48</div>
                    <span class="hide-sm"> Бюджетных мест по всем условиям поступления </span>
                    <span class="display-sm"> Всего мест </span>
                    <button type="button" class="informer"><i class="icon icon-info"></i></button>
                  </div>
                  <div class="statistic-block" style="background: none; box-shadow: none; padding: 0;">
                    <div class="num" style="font-size: 80px; font-weight: 800; line-height: 1;">91</div>
                    <span style="font-size: 14px; color: #666;">Количество поданных заявлений</span>
                  </div>
                </div>
              </div>

              <div class="filter-block search-form">
                <form name="searchForm" onsubmit="return false;">
                  <div class="search-group">
                    <input type="text" placeholder="поиск" class="search">
                    <button type="submit" class="btn-search"><i class="icon icon-arrow-right-black"></i></button>
                  </div>
                  <div>
                    <div dir="auto" class="v-select vs--single vs--unsearchable">
                      <div class="vs__dropdown-toggle">
                        <div class="vs__selected-options">
                          <span class="vs__selected">Посмотреть список подавших заявление</span>
                        </div>
                        <div class="vs__actions">
                          <span class="icon icon-arrow-down vs__open-indicator" role="presentation"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div class="entrants">
                <table>
                  <thead>
                    <tr class="table-row">
                      <th><div>#</div></th>
                      <th><div>Уникальный код поступающего</div></th>
                      <th class="hide-sm"><div>Номер приоритета</div></th>
                      <th class="hide-sm"><div>Основной высший приоритет</div></th>
                      <th><div>Сумма баллов</div></th>
                      <th class="hide-sm"><div>Согласие на зачисление</div></th>
                      <th class="hide-sm"><div>Рекомендации к зачислению</div></th>
                      <th class="status"><div> </div></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colspan="9">
                        <div class="entrants-type">
                          <div class="title"><span>целевой приём</span> <i class="icon icon-arrow-down"></i></div>
                          <div class="status places">
                            <div class="label"><span>свободно</span> <span>мест</span>: <span class="num">0</span></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="9">
                        <div class="entrants-type">
                          <div class="title"><span>отдельная квота</span> <i class="icon icon-arrow-down"></i></div>
                          <div class="status places">
                            <div class="label"><span>свободно</span> <span>мест</span>: <span class="num">0</span></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="9">
                        <div class="entrants-type">
                          <div class="title"><span>особая квота</span> <i class="icon icon-arrow-down"></i></div>
                          <div class="status places">
                            <div class="label"><span>свободно</span> <span>мест</span>: <span class="num">0</span></div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    <template v-for="(entrant, index) in entrants" :key="entrant.id">
                      <tr class="table-row">
                        <td><div><span class="number">{{ index + 1 }}</span></div></td>
                        <td><div><b>{{ entrant.id }}</b></div></td>
                        <td class="hide-sm"><div><b>{{ entrant.priority }}</b></div></td>
                        <td class="hide-sm"><div><b>{{ entrant.higherPriority }}</b></div></td>
                        <td><div><span>{{ entrant.totalScore }}</span></div></td>
                        <td class="hide-sm"><div><b>{{ entrant.consent }}</b></div></td>
                        <td class="hide-sm"><div><span class="recommendations">{{ entrant.recommendation }}</span></div></td>
                        <td>
                          <div>
                            <div class="status hide-sm" :class="{ open: expandedId === entrant.id }">
                              <div class="label" style="cursor: pointer; background: #fff; color: #333; border: 1px solid #e0e0e0" @click="toggleExpand(entrant.id)">
                                <span>Подано</span>
                                <i class="icon icon-arrow-down" style="filter: brightness(0.5);"></i>
                              </div>
                              <div class="disciplines">
                                <div v-for="disc in entrant.disciplines" :key="disc.name">
                                  <span>{{ disc.name }}</span>
                                  <span>{{ disc.score }}</span>
                                </div>
                                <div>
                                  <span>Сумма баллов за инд.дост.</span>
                                  <span>{{ entrant.indAchievements }}</span>
                                </div>
                                <div>
                                  <span>Без вступительных испытаний</span>
                                  <span>{{ entrant.bvi }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Reset and normalization for NSU styles */
.nsu-mock-page {
  font-family: "Montserrat", sans-serif;
  color: #333;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.nsu-mock-page :deep(*) {
  box-sizing: border-box;
}

.nsu-mock-page :deep(.wrapper) {
  min-height: 100vh;
  background-color: #f4f7f6;
  position: relative;
  z-index: 1;
}

/* Ensure the disciplines block is visible when open class is present */
.nsu-mock-page :deep(.status.open .disciplines) {
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}

/* Remove scoped overrides to rely on original styles copied from HTML */
</style>
