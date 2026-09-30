import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EditEventPage } from './pages/EditEventPage';
import { AttendeeDashboard } from './pages/AttendeeDashboard';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { InvitationAcceptPage } from './pages/InvitationAcceptPage';
import { TicketPage } from './pages/TicketPage';
import { TicketScannerPage } from './pages/TicketScannerPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('attendee' | 'organizer' | 'admin')[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/explore" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Discovery Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />
                <Route path="/invitations/:token" element={<InvitationAcceptPage />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Organizer Event Management */}
                <Route
                  path="/events/create"
                  element={
                    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                      <CreateEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events/:id/edit"
                  element={
                    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                      <EditEventPage />
                    </ProtectedRoute>
                  }
                />

                {/* Digital Ticket Pass Routes */}
                <Route
                  path="/tickets/:ticketId"
                  element={
                    <ProtectedRoute>
                      <TicketPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/tickets" element={<Navigate to="/dashboard/attendee" replace />} />

                {/* Organizer Attendance Scanner Routes */}
                <Route
                  path="/dashboard/scanner"
                  element={
                    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                      <TicketScannerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scanner"
                  element={
                    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                      <TicketScannerPage />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboards */}
                <Route
                  path="/dashboard/attendee"
                  element={
                    <ProtectedRoute allowedRoles={['attendee', 'admin']}>
                      <AttendeeDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/organizer"
                  element={
                    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                      <OrganizerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* User Profile */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
