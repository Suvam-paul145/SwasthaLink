import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom chart theme based on the SwasthaLink design
export const chartTheme = {
  primaryColor: '#4fdbc8',
  secondaryColor: '#00d9ff',
  errorColor: '#ef4444',
  backgroundColor: 'rgba(79, 219, 200, 0.1)',
  gridColor: 'rgba(255, 255, 255, 0.05)',
  textColor: '#94a3b8',
  fontFamily: "'Inter', sans-serif",
};

export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: chartTheme.textColor,
        font: {
          family: chartTheme.fontFamily,
          size: 11,
          weight: 'bold',
        },
        padding: 16,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(10, 14, 26, 0.95)',
      titleColor: chartTheme.primaryColor,
      bodyColor: '#ffffff',
      borderColor: chartTheme.primaryColor,
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      titleFont: {
        family: chartTheme.fontFamily,
        size: 13,
        weight: 'bold',
      },
      bodyFont: {
        family: chartTheme.fontFamily,
        size: 12,
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: chartTheme.gridColor,
        drawBorder: false,
      },
      ticks: {
        color: chartTheme.textColor,
        font: {
          family: chartTheme.fontFamily,
          size: 10,
        },
      },
    },
    y: {
      grid: {
        color: chartTheme.gridColor,
        drawBorder: false,
      },
      ticks: {
        color: chartTheme.textColor,
        font: {
          family: chartTheme.fontFamily,
          size: 10,
        },
      },
    },
  },
};

export { ChartJS };
