<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"

definePageMeta({
  layout: false,
})

const { data: ratingData, refresh } = await useFetch("/api/rating")

const expandedId = ref<string | null>(null)
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

let interval: any = null
onMounted(() => {
  interval = setInterval(() => {
    refresh()
  }, 20000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<template>
  <div v-if="ratingData" class="nsu-mock-page">
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
                          <span class="vs__selected">{{ ratingData.faculty.name }}</span>
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
                    <div class="faculty"><span>{{ ratingData.faculty.name }}</span></div>
                    <div class="info-places">
                      <p><span>Количество бюджетных мест по всем условиям поступления <b>{{ ratingData.info.places.total.value }}</b>. Зачислено</span>:</p>
                      <ul>
                        <li v-for="(val, label) in ratingData.info.places.summ" :key="label">
                          {{ label }} - <b>{{ val }}</b>
                        </li>
                      </ul>
                      <p>Всего зачислено: <b>{{ ratingData.info.places.credit.value }}</b>. К зачислению: <b>{{ ratingData.info.places.enroll.value }}</b>.</p>
                    </div>
                    <div class="info-date">
                      <p>Время последнего обновления рейтингового списка: {{ ratingData.info.date }}</p>
                    </div>
                  </div>
                </div>
                <div class="statistic-blocks">
                  <div class="statistic-block display-sm">
                    <div class="num">{{ ratingData.info.places.total.value }}</div>
                    <span class="hide-sm"> Бюджетных мест по всем условиям поступления </span>
                    <span class="display-sm"> Всего мест </span>
                    <button type="button" class="informer"><i class="icon icon-info"></i></button>
                  </div>
                  <div class="statistic-block" style="background: none; box-shadow: none; padding: 0;">
                    <div class="num" style="font-size: 80px; font-weight: 800; line-height: 1;">{{ ratingData.info.countApplications }}</div>
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
                      <th><div>{{ ratingData.info.fields.number }}</div></th>
                      <th><div>{{ ratingData.info.fields.name }}</div></th>
                      <th class="hide-sm"><div>{{ ratingData.info.fields.priority }}</div></th>
                      <th class="hide-sm"><div>{{ ratingData.info.fields.isMainTopPriority }}</div></th>
                      <th><div>{{ ratingData.info.fields.sumPointTotal }}</div></th>
                      <th class="hide-sm"><div>{{ ratingData.info.fields.consent }}</div></th>
                      <th class="hide-sm"><div>{{ ratingData.info.fields.recommendations }}</div></th>
                      <th class="status"><div> </div></th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="category in ratingData.items" :key="category.title">
                      <tr>
                        <td colspan="9">
                          <div class="entrants-type">
                            <div class="title"><span>{{ category.title }}</span> <i class="icon icon-arrow-down"></i></div>
                            <div class="status places">
                              <div class="label"><span>свободно</span> <span>мест</span>: <span class="num">{{ category.info.freePlaces }}</span></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr v-for="entrant in category.table" :key="entrant.code" class="table-row">
                        <td><div><span class="number">{{ entrant.number }}</span></div></td>
                        <td><div><b>{{ entrant.code }}</b></div></td>
                        <td class="hide-sm"><div><b>{{ entrant.priority }}</b></div></td>
                        <td class="hide-sm"><div><b>{{ entrant.isMainTopPriority || 'Нет' }}</b></div></td>
                        <td><div><span>{{ entrant.sumPointTotal }}</span></div></td>
                        <td class="hide-sm"><div><b>{{ entrant.consent }}</b></div></td>
                        <td class="hide-sm"><div><span class="recommendations">{{ entrant.recommendations }}</span></div></td>
                        <td>
                          <div>
                            <div class="status hide-sm" :class="{ open: expandedId === entrant.code }">
                              <div
                                class="label"
                                :style="entrant.status === 'Зачислен' ? 'cursor: pointer; background: #72c81a; color: #fff; border: 1px solid #72c81a' : 'cursor: pointer; background: #fff; color: #333; border: 1px solid #e0e0e0'"
                                @click="toggleExpand(entrant.code)"
                              >
                                <span>{{ entrant.status }}</span>
                                <i class="icon" :class="entrant.status === 'Зачислен' ? 'icon-arrow-down-white' : 'icon-arrow-down'" :style="entrant.status === 'Зачислен' ? '' : 'filter: brightness(0.5);'"></i>
                              </div>
                              <div v-if="entrant.disciplines && entrant.disciplines.length" class="disciplines">
                                <div v-for="disc in entrant.disciplines" :key="disc.name">
                                  <span>{{ disc.name }}</span>
                                  <span>{{ disc.point }}</span>
                                </div>
                                <div>
                                  <span>{{ ratingData.info.fields.sumPointAchievement }}</span>
                                  <span>{{ entrant.sumPointAchievement }}</span>
                                </div>
                                <div>
                                  <span>Без вступительных испытаний</span>
                                  <span>{{ entrant.without_entrance_tests || 'Нет' }}</span>
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
