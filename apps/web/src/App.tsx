import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Splash } from './pages/Splash';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';

export function App() {
  const { loading } = useAuth();
  if (loading) return <Splash />;
  return (
    <BrowserRouter>
      <div className="overflow-x-hidden min-h-full">
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
      </div>
    </BrowserRouter>
  );
}