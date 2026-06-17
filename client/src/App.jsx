import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.jsx';
import { Shell } from './components/layout/Shell.jsx';
import { AnalysesPage } from './pages/AnalysesPage.jsx';
import { AnalysisPage } from './pages/AnalysisPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ExtensionPage } from './pages/ExtensionPage.jsx';
import { JobMatcherPage } from './pages/JobMatcherPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotesPage } from './pages/NotesPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ResumeMatcherPage } from './pages/ResumeMatcherPage.jsx';
import { RoadmapPage } from './pages/RoadmapPage.jsx';
import { selectAuthToken } from './store/authSlice.js';
import { useAppDispatch, useAppSelector } from './store/hooks.js';
import { restoreSession } from './store/slices/authSlice.js';

function ProtectedRoute({ children }) {
  const token = useSelector(selectAuthToken);
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="matcher" element={<JobMatcherPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="extension" element={<ExtensionPage />} />
      </Route>
    </Routes>
  );
}
function ProtectedRoute({ children }) {
  const token = useAppSelector((state) => state.auth.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="analyses" element={<AnalysesPage />} />
        <Route path="resume-matcher" element={<ResumeMatcherPage />} />
        <Route path="roadmaps" element={<RoadmapPage />} />
        <Route path="notes" element={<NotesPage />} />
      </Route>
    </Routes>
  );
}