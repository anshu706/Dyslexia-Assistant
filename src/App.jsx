import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage.jsx';
import WorkspaceApp from './pages/WorkspaceApp.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Workspace — all /app sub-paths land here; view switching is internal */}
        <Route path="/app" element={<WorkspaceApp />} />
        <Route path="/app/*" element={<WorkspaceApp />} />

        {/* Legacy redirect: /app.html → /app */}
        <Route path="/app.html" element={<Navigate to="/app" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
