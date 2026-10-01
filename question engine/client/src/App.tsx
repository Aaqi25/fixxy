import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthContext';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { LoginPage } from './modules/auth/LoginPage';
import { RegisterPage } from './modules/auth/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { CurriculumPage } from './modules/curriculum/CurriculumPage';
import { ConceptDetailPage } from './modules/curriculum/ConceptDetailPage';
import { LearningSessionPage } from './modules/questions/LearningSessionPage';
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
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/curriculum/:slug" element={<ConceptDetailPage />} />
            <Route path="/learn/:conceptSlug" element={<LearningSessionPage />} />
          </Route>

          {/* Global 404 fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
