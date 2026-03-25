import { Bar } from 'react-chartjs-2';
import { chartTheme, defaultChartOptions } from '../utils/chartConfig';

function ComprehensionScoreChart({ data, className = "" }) {
  const chartData = {
    labels: data?.labels || ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
    datasets: [
      {
        label: 'Average Comprehension Score',
        data: data?.scores || [72, 78, 82, 85, 88.5],
        backgroundColor: [
          'rgba(79, 219, 200, 0.6)',
          'rgba(79, 219, 200, 0.7)',
          'rgba(79, 219, 200, 0.8)',
          'rgba(79, 219, 200, 0.9)',
          'rgba(79, 219, 200, 1)',
        ],
        borderColor: chartTheme.primaryColor,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Target Benchmark',
        data: Array(5).fill(85),
        type: 'line',
        borderColor: chartTheme.secondaryColor,
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
  };

  return (
    <div className={`glass-card p-6 rounded-xl border border-white/5 ${className}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-headline font-bold text-white">Comprehension Trends</h3>
          <p className="text-slate-400 text-sm mt-1">Patient understanding scores over time</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">88.5</div>
          <div className="text-xs text-slate-400 uppercase">Current Avg</div>
        </div>
      </div>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

export default ComprehensionScoreChart;
