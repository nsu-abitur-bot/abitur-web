import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js"

export default defineNuxtPlugin(() => {
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    LineController,
  )
})
