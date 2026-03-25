import { Doughnut } from 'react-chartjs-2';
import { chartTheme, defaultChartOptions } from '../utils/chartConfig';

function ProcessingStatusDoughnut({ className = "" }) {
  const chartData = {
    labels: ['Completed', 'Processing', 'Pending', 'Failed'],
    datasets: [
      {
        data: [2145, 187, 58, 20],
        backgroundColor: [
          chartTheme.primaryColor,
          chartTheme.secondaryColor,
          'rgba(148, 163, 184, 0.5)',
          chartTheme.errorColor,
        ],
        borderColor: '#0a0e1a',
        borderWidth: 3,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    ...defaultChartOptions,
    cutout: '70%',
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        position: 'bottom',
      },
    },
  };

  const totalProcessed = chartData.datasets[0].data.reduce((a, b) => a + b, 0);

  return (
    <div className={`glass-card p-6 rounded-xl border border-white/5 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-headline font-bold text-white">Processing Status</h3>
        <p className="text-slate-400 text-sm mt-1">Document workflow distribution</p>
      </div>
      <div className="relative h-80">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-4xl font-bold text-white">{totalProcessed}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Documents</div>
        </div>
      </div>
    </div>
  );
}

export default ProcessingStatusDoughnut;
