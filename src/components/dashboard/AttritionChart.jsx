import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

export default function AttritionChart({ results }) {
  if (!results || !results.length) return null

  const labels    = results.map(r => r.label)
  const attrPct   = results.map(r => parseFloat(r.attrPct.toFixed(2)))
  const totalAttr = results.map(r => r.totalAttr)
  const newHire   = results.map(r => r.totalNH)

  const data = {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Attrition %',
        data: attrPct,
        borderColor: '#E24B4A',
        backgroundColor: 'rgba(226,75,74,0.08)',
        borderWidth: 2,
        borderDash: [5, 3],
        pointRadius: 4,
        pointBackgroundColor: '#E24B4A',
        tension: 0.3,
        yAxisID: 'y1',
      },
      {
        type: 'bar',
        label: 'Total Attrition',
        data: totalAttr,
        backgroundColor: 'rgba(55,138,221,0.7)',
        borderColor: '#378ADD',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: 'New Hire',
        data: newHire,
        backgroundColor: 'rgba(29,158,117,0.7)',
        borderColor: '#1D9E75',
        borderWidth: 1,
        yAxisID: 'y',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 11 } }
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        ticks: { font: { size: 10 } },
        grid: { display: false }
      },
      y: {
        position: 'left',
        ticks: { font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
        title: { display: true, text: 'Jumlah', font: { size: 10 } },
      },
      y1: {
        position: 'right',
        ticks: {
          font: { size: 10 },
          callback: v => v.toFixed(1) + '%'
        },
        grid: { display: false },
        title: { display: true, text: 'Attrition %', font: { size: 10 } },
      },
    },
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Trend Attrition per Bulan
      </h3>
      <div style={{ height: 220 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}