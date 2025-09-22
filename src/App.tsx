import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AlumniListPage from './pages/AlumniListPage';
import AlumniProfilePage from './pages/AlumniProfilePage';
import StudentsPage from './pages/StudentsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import EventsPage from './pages/EventsPage';
import RegistrationsPage from './pages/RegistrationsPage';
import AdminCleanupPage from './pages/AdminCleanupPage';
import EnhancedCollaborationHubPage from './pages/EnhancedCollaborationHubPage';
import TeamWorkspacePage from './pages/TeamWorkspacePage';
import MessagesPage from './pages/MessagesPage';
import AlumniMessagesPage from './pages/AlumniMessagesPage';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AzureTestPage } from './components/AzureTestPage2';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/collaboration" element={<EnhancedCollaborationHubPage />} />
          <Route path="/teams/:teamId" element={<TeamWorkspacePage />} />
          <Route path="/registrations" element={<ProtectedRoute requiredRoles={['admin']}> <RegistrationsPage /> </ProtectedRoute>} />
          <Route path="/admin/cleanup" element={<ProtectedRoute requiredRoles={['admin']}> <AdminCleanupPage /> </ProtectedRoute>} />
          <Route path="/alumni" element={<AlumniListPage />} />
          <Route path="/alumni/:id" element={<AlumniProfilePage />} />
          <Route path="/students" element={<ProtectedRoute requiredRoles={['admin','alumni','student']}> <StudentsPage /> </ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute requiredRoles={['admin','alumni','student']}> <StudentProfilePage /> </ProtectedRoute>} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/messages" element={<ProtectedRoute requiredRoles={['student']}> <MessagesPage /> </ProtectedRoute>} />
          <Route path="/alumni-messages" element={<ProtectedRoute requiredRoles={['alumni']}> <AlumniMessagesPage /> </ProtectedRoute>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}