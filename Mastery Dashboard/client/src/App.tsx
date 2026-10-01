import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthContext';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { LoginPage } from './modules/auth/LoginPage';
import { RegisterPage } from './modules/auth/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { CurriculumPage } from './modules/curriculum/CurriculumPage';
import { ConceptDetailPage } from './modules/curriculum/ConceptDetailPage';
import { PracticePage } from './modules/answer-submission/PracticePage';
import { RetryTransferPage } from './modules/retry-transfer/RetryTransferPage';
import { MasteryDashboard } from './modules/mastery/MasteryDashboard';
import { NotFoundPage } from './components/shared/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MasteryDashboard />} />
            <Route path="/mastery" element={<MasteryDashboard />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/curriculum/:slug" element={<ConceptDetailPage />} />
            <Route path="/curriculum/:slug/practice" element={<PracticePage />} />
            <Route path="/practice/:slug" element={<PracticePage />} />
            <Route path="/curriculum/:slug/retry-transfer" element={<RetryTransferPage />} />
            <Route path="/curriculum/:slug/learn" element={<RetryTransferPage />} />
            <Route path="/retry-transfer/:sessionId" element={<RetryTransferPage />} />
            <Route path="/learn/:conceptId" element={<Navigate to="/curriculum" replace />} />
          </Route>

          {/* Global 404 fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
