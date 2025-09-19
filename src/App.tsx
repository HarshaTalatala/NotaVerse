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
// Collaboration imports temporarily disabled - will be rebuilt later
// import CollaborationHubPage from './pages/CollaborationHubPage';
// import NotesUploadPage from './pages/NotesUploadPage';
// import VaultDetailsPage from './pages/VaultDetailsPage';
// import NoteDetailsPage from './pages/NoteDetailsPage';
// import SearchPage from './pages/SearchPage';
// import CreateVaultPage from './pages/CreateVaultPage';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alumni" element={<AlumniListPage />} />
          <Route path="/alumni/:id" element={<AlumniProfilePage />} />
          <Route path="/students" element={<ProtectedRoute requiredRoles={['admin','alumni','student']}> <StudentsPage /> </ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute requiredRoles={['admin','alumni','student']}> <StudentProfilePage /> </ProtectedRoute>} />
          <Route path="/events" element={<EventsPage />} />
          
          {/* Collaboration Hub Routes - Temporarily disabled, will be rebuilt later
          <Route path="/collaboration-hub" element={<CollaborationHubPage />} />
          <Route path="/collaboration-hub/upload" element={<ProtectedRoute requiredRoles={['student']}><NotesUploadPage /></ProtectedRoute>} />
          <Route path="/collaboration-hub/vaults/:id" element={<VaultDetailsPage />} />
          <Route path="/collaboration-hub/notes/:id" element={<NoteDetailsPage />} />
          <Route path="/collaboration-hub/search" element={<SearchPage />} />
          <Route path="/collaboration-hub/vaults/new" element={<ProtectedRoute requiredRoles={['student']}><CreateVaultPage /></ProtectedRoute>} />
          */}
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}



