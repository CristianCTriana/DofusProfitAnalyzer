import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CatalogoProvider } from "./context/CatalogoContext";
import { ServidorProvider } from "./context/ServidorContext";
import { Calculadora } from "./pages/Calculadora";
import { Dashboard } from "./pages/Dashboard";
import { Items } from "./pages/Items";
import { Login } from "./pages/Login";
import { RecetaDetalle } from "./pages/RecetaDetalle";
import { Recetas } from "./pages/Recetas";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <ServidorProvider>
              <CatalogoProvider>
                <AppLayout />
              </CatalogoProvider>
            </ServidorProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="mercadillos" element={<Recetas />} />
        <Route path="mercadillos/:id" element={<RecetaDetalle />} />
        <Route path="items" element={<Items />} />
        <Route path="calculadora" element={<Calculadora />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
