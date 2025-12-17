import { Routes, Route } from "react-router-dom";
import CustomerPage from "./customer/CustomerPage";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import AdminRoute from "./admin/AdminRoute";

export default function App() {
  return (
    <Routes>
      {/* Customer */}
      <Route path="/" element={<CustomerPage />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
