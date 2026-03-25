import { Line } from 'react-chartjs-2';
import { chartTheme, defaultChartOptions } from '../utils/chartConfig';

function ReadmissionRiskChart({ data, className = "" }) {
  const chartData = {
    labels: data?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Readmission Risk %',
        data: data?.risk || [18.5, 16.2, 14.8, 13.5, 12.9, 12.4],
        borderColor: chartTheme.errorColor,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: chartTheme.errorColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Industry Average',
        data: Array(6).fill(15),
        borderColor: chartTheme.textColor,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        display: true,
      },
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales.y,
        min: 0,
        max: 20,
        ticks: {
          ...defaultChartOptions.scales.y.ticks,
          callback: function(value) {
            return value + '%';
          },
        },
      },
    },
  };

  return (
    <div className={`glass-card p-6 rounded-xl border border-white/5 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-headline font-bold text-white">Readmission Risk Analysis</h3>
          <p className="text-slate-400 text-sm mt-1">6-month trend analysis</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-green-400 text-lg">trending_down</span>
          <span className="text-green-400 font-bold">-6.1% vs Q1</span>
        </div>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default ReadmissionRiskChart;
