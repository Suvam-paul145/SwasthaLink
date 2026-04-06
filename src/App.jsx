import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
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
import CaregiverDashboardPage from "./pages/CaregiverDashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/share/:token" element={<CaregiverDashboardPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/overview" element={<ClarityHubPage />} />
        <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
        <Route path="/clarity-hub" element={<DetailedClarityHubPage />} />
        <Route path="/clarity-center" element={<Navigate to="/clarity-hub" replace />} />
        <Route
          path="/family-dashboard"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <FamilyDashboardPage />
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
              <AdminPanelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor-panel"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorPanelPage />
            </ProtectedRoute>
          }
        />
        <Route path="/patients" element={<Navigate to="/admin-panel" replace />} />
        <Route path="/showcase" element={<ComponentShowcasePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
