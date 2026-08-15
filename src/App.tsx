import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RecordsPage from "./pages/RecordsPage";
import InvoiceListPage from "./pages/InvoiceListPage";
import InvoicePage from "./pages/InvoicePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/add" element={<RecordsPage />} />
      <Route path="/invoices" element={<InvoiceListPage />} />
      <Route path="/invoice/:id" element={<InvoicePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
