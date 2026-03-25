import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import AdminPanelPage from "./pages/AdminPanelPage";
import ClarityHubPage from "./pages/ClarityHubPage";
import DetailedClarityHubPage from "./pages/DetailedClarityHubPage";
import FamilyDashboardPage from "./pages/FamilyDashboardPage";
import SettingsPage from "./pages/SettingsPage";
import ComponentShowcasePage from "./pages/ComponentShowcasePage";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<ClarityHubPage />} />
        <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
        <Route path="/clarity-hub" element={<DetailedClarityHubPage />} />
        <Route path="/clarity-center" element={<Navigate to="/clarity-hub" replace />} />
        <Route path="/family-dashboard" element={<FamilyDashboardPage />} />
        <Route path="/family-hub" element={<Navigate to="/family-dashboard" replace />} />
        <Route path="/admin-panel" element={<AdminPanelPage />} />
        <Route path="/patients" element={<Navigate to="/admin-panel" replace />} />
        <Route path="/showcase" element={<ComponentShowcasePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export default App;
