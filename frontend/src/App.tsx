import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { PromocodesPage } from './pages/PromocodesPage';
import { RegisterPage } from './pages/RegisterPage';
import { RequireAuth } from './routes/RequireAuth';
import { DateRangeProvider } from './context/DateRangeContext';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route
            path="/analytics"
            element={
              <DateRangeProvider>
                <AnalyticsPage />
              </DateRangeProvider>
            }
          />
          <Route path="/promocodes" element={<PromocodesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
