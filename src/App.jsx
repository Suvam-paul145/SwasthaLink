import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import CursorGlow from "./components/effects/CursorGlow";
import NeuralBackground from "./components/effects/NeuralBackground";
import AdminPanelPage from "./pages/AdminPanelPage";
import ClarityHubPage from "./pages/ClarityHubPage";
import DetailedClarityHubPage from "./pages/DetailedClarityHubPage";
import FamilyDashboardPage from "./pages/FamilyDashboardPage";
import SettingsPage from "./pages/SettingsPage";
import ComponentShowcasePage from "./pages/ComponentShowcasePage";
import DoctorPanelPage from "./pages/DoctorPanelPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LandingPage from "./pages/LandingPage";

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
      </AnimatePresence>
    </>
  );
}

export default App;
