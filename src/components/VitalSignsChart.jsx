import { Line } from 'react-chartjs-2';
import { chartTheme, defaultChartOptions } from '../utils/chartConfig';

function VitalSignsChart({ data, className = "" }) {
  const chartData = {
    labels: data?.labels || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    datasets: [
      {
        label: 'Heart Rate (BPM)',
        data: data?.heartRate || [68, 72, 70, 75, 73, 71, 72],
        borderColor: chartTheme.primaryColor,
        backgroundColor: chartTheme.backgroundColor,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: chartTheme.primaryColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Blood Pressure (Systolic)',
        data: data?.bloodPressure || [120, 118, 122, 119, 121, 120, 119],
        borderColor: chartTheme.secondaryColor,
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: chartTheme.secondaryColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: false,
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className={`glass-card p-6 rounded-xl border border-white/5 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-headline font-bold text-white">Vital Signs Monitor</h3>
          <p className="text-slate-400 text-sm mt-1">24-hour tracking</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase">Live</span>
        </div>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default VitalSignsChart;
