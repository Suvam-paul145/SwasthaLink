import { lazy, Suspense } from 'react';

const MedicalHeart3D = lazy(() => import('../components/MedicalHeart3D'));
const DNA3DHelix = lazy(() => import('../components/DNA3DHelix'));
const FloatingMedicalCube = lazy(() => import('../components/FloatingMedicalCube'));
const CapsuleFloat3D = lazy(() => import('../components/CapsuleFloat3D'));
const VitalPulseRing3D = lazy(() => import('../components/VitalPulseRing3D'));
const CareShield3D = lazy(() => import('../components/CareShield3D'));
const MedicalParticles3D = lazy(() => import('../components/MedicalParticles3D'));
import VitalSignsChart from '../components/VitalSignsChart';
import ComprehensionScoreChart from '../components/ComprehensionScoreChart';
import ProcessingStatusDoughnut from '../components/ProcessingStatusDoughnut';
import ReadmissionRiskChart from '../components/ReadmissionRiskChart';

function Lazy3DFallback() {
  return (
    <div className="h-80 flex items-center justify-center bg-white/5 rounded-xl">
      <div className="text-center space-y-2">
        <span className="material-symbols-outlined text-primary text-4xl animate-pulse">view_in_ar</span>
        <p className="text-xs text-slate-400">Loading 3D...</p>
      </div>
    </div>
  );
}

function ComponentShowcasePage() {
  return (
    <div className="p-8 space-y-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-headline font-extrabold text-white mb-4">
            SwasthaLink 3D & Charts Showcase
          </h1>
          <p className="text-slate-400 text-lg">
            Interactive medical data visualizations powered by Three.js & Chart.js
          </p>
        </div>

        {/* 3D Components Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-headline font-bold text-white mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">view_in_ar</span>
            3D Visualizations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Floating Medical Cube */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">Floating Medical Cube</h3>
                <p className="text-xs text-slate-400 mt-1">3D metric display</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <FloatingMedicalCube value="99.2%" label="AI Accuracy" className="h-80" />
              </Suspense>
            </div>

            {/* Medical Heart */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">Medical Heart 3D</h3>
                <p className="text-xs text-slate-400 mt-1">Animated heartbeat</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <MedicalHeart3D bpm={72} className="h-80" />
              </Suspense>
            </div>

            {/* DNA Helix */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">DNA Helix</h3>
                <p className="text-xs text-slate-400 mt-1">Genetic visualization</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <DNA3DHelix className="h-80" />
              </Suspense>
            </div>
            {/* Capsule Float */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">Capsule Float 3D</h3>
                <p className="text-xs text-slate-400 mt-1">Floating medication pill</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <CapsuleFloat3D label="Medication" className="h-80" />
              </Suspense>
            </div>

            {/* Vital Pulse Ring */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">Vital Pulse Ring</h3>
                <p className="text-xs text-slate-400 mt-1">ECG pulse visualization</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <VitalPulseRing3D bpm={72} className="h-80" />
              </Suspense>
            </div>

            {/* Care Shield */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">Care Shield 3D</h3>
                <p className="text-xs text-slate-400 mt-1">Medical protection icon</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <CareShield3D label="Protected" className="h-80" />
              </Suspense>
            </div>

            {/* Medical Particles */}
            <div className="glass-card rounded-xl overflow-hidden border border-white/5">
              <div className="p-4 bg-white/5 border-b border-white/5">
                <h3 className="font-bold text-white">Medical Particles</h3>
                <p className="text-xs text-slate-400 mt-1">Ambient health data nodes</p>
              </div>
              <Suspense fallback={<Lazy3DFallback />}>
                <MedicalParticles3D count={40} className="h-80" />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section>
          <h2 className="text-3xl font-headline font-bold text-white mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">analytics</span>
            Data Charts
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vital Signs Chart */}
            <VitalSignsChart />

            {/* Comprehension Score Chart */}
            <ComprehensionScoreChart />

            {/* Readmission Risk Chart */}
            <ReadmissionRiskChart />

            {/* Processing Status Doughnut */}
            <ProcessingStatusDoughnut />
          </div>
        </section>

        {/* Features Grid */}
        <section className="mt-16">
          <h2 className="text-3xl font-headline font-bold text-white mb-8 text-center">
            Component Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">3d_rotation</span>
              </div>
              <h3 className="font-bold text-white mb-2">Interactive 3D</h3>
              <p className="text-sm text-slate-400">
                Fully interactive Three.js visualizations with orbit controls
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">monitoring</span>
              </div>
              <h3 className="font-bold text-white mb-2">Real-time Data</h3>
              <p className="text-sm text-slate-400">
                Live updating charts with smooth transitions and animations
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">responsive_layout</span>
              </div>
              <h3 className="font-bold text-white mb-2">Responsive Design</h3>
              <p className="text-sm text-slate-400">
                Fully responsive components that adapt to any screen size
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">palette</span>
              </div>
              <h3 className="font-bold text-white mb-2">Themed Styling</h3>
              <p className="text-sm text-slate-400">
                Consistent SwasthaLink theme with glass morphism effects
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mt-16 glass-card p-8 rounded-xl border border-white/5">
          <h2 className="text-2xl font-headline font-bold text-white mb-6 text-center">
            Powered By
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">📦</div>
              <h4 className="font-bold text-white text-sm">Three.js</h4>
              <p className="text-xs text-slate-400">3D Graphics</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-2">⚛️</div>
              <h4 className="font-bold text-white text-sm">React Three Fiber</h4>
              <p className="text-xs text-slate-400">React Renderer</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <h4 className="font-bold text-white text-sm">Chart.js</h4>
              <p className="text-xs text-slate-400">Data Charts</p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-2">🎨</div>
              <h4 className="font-bold text-white text-sm">Framer Motion</h4>
              <p className="text-xs text-slate-400">Animations</p>
            </div>
          </div>
        </section>

        {/* Component Stats */}
        <section className="mt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <h3 className="text-3xl font-bold text-primary">7</h3>
              <p className="text-sm text-slate-400 mt-1">New Components</p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <h3 className="text-3xl font-bold text-primary">3</h3>
              <p className="text-sm text-slate-400 mt-1">3D Visualizations</p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <h3 className="text-3xl font-bold text-primary">4</h3>
              <p className="text-sm text-slate-400 mt-1">Chart Types</p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/5 text-center">
              <h3 className="text-3xl font-bold text-primary">100%</h3>
              <p className="text-sm text-slate-400 mt-1">Customizable</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ComponentShowcasePage;
