import './styles/main.css';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import InvitationPage from './pages/InvitationPage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import LazygyuRoomPage from './pages/LazygyuRoomPage';
import LazygyuHostPage from './pages/LazygyuHostPage';
import { markFriendVisitor } from './lib/visitorEntry';

function FriendEntryRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    markFriendVisitor();
    navigate('/', { replace: true });
  }, [navigate]);

  return null;
}

function App() {
  return (
    <Routes>
      <Route element={<InvitationPage />} path="/" />
      <Route element={<FriendEntryRoute />} path="/friend" />
      <Route element={<AuthPage mode="login" />} path="/login" />
      <Route element={<AuthPage mode="signup" />} path="/signup" />
      <Route element={<LazygyuRoomPage />} path="/games/lazygyu" />
      <Route
        element={
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        }
        path="/admin"
      />
      <Route
        element={
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        }
        path="/admin/:section"
      />
      <Route
        element={
          <ProtectedRoute requireAdmin>
            <LazygyuHostPage />
          </ProtectedRoute>
        }
        path="/host/lazygyu"
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export default App;
