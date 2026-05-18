import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import CursorGlow from "./components/effects/CursorGlow";
import NeuralBackground from "./components/effects/NeuralBackground";
const AdminPanelPage = lazy(() => import("./pages/AdminPanelPage"));
const ClarityHubPage = lazy(() => import("./pages/ClarityHubPage"));
const DetailedClarityHubPage = lazy(() => import("./pages/DetailedClarityHubPage"));
const FamilyDashboardPage = lazy(() => import("./pages/FamilyDashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ComponentShowcasePage = lazy(() => import("./pages/ComponentShowcasePage"));
const DoctorPanelPage = lazy(() => import("./pages/DoctorPanelPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

export function PageLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-4 border-teal-500/10" />
        <div className="absolute inset-0 rounded-full border-4 border-t-teal-400 animate-spin" />
      </div>
    </div>
  );
}


const pageMotion = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

function AnimatedPage({ children }) {
  return (
    <motion.div {...pageMotion} className="flex-1 flex flex-col">
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();

  return (
    <>
      <LoadingScreen minDuration={2000} />
      <CursorGlow />
      <NeuralBackground />

      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AnimatedPage><LandingPage /></AnimatedPage>} />
            <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
            <Route path="/signup" element={<AnimatedPage><SignupPage /></AnimatedPage>} />
            <Route path="/forgot-password" element={<AnimatedPage><ForgotPasswordPage /></AnimatedPage>} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/overview" element={<AnimatedPage><ClarityHubPage /></AnimatedPage>} />
              <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
              <Route path="/clarity-hub" element={<AnimatedPage><DetailedClarityHubPage /></AnimatedPage>} />
              <Route path="/clarity-center" element={<Navigate to="/clarity-hub" replace />} />
              <Route
                path="/family-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["patient"]}>
                    <AnimatedPage><FamilyDashboardPage /></AnimatedPage>
                  </ProtectedRoute>
                }
              />
              <Route path="/patient-panel" element={<Navigate to="/family-dashboard" replace />} />
              <Route path="/patient" element={<Navigate to="/family-dashboard" replace />} />
              <Route path="/family-hub" element={<Navigate to="/family-dashboard" replace />} />
              <Route
                path="/admin-panel"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AnimatedPage><AdminPanelPage /></AnimatedPage>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor-panel"
                element={
                  <ProtectedRoute allowedRoles={["doctor"]}>
                    <AnimatedPage><DoctorPanelPage /></AnimatedPage>
                  </ProtectedRoute>
                }
              />
              <Route path="/patients" element={<Navigate to="/admin-panel" replace />} />
              <Route path="/showcase" element={<AnimatedPage><ComponentShowcasePage /></AnimatedPage>} />
              <Route path="/settings" element={<AnimatedPage><SettingsPage /></AnimatedPage>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

export default App;
