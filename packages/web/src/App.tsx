import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.js';

// Layouts
import { CustomerLayout } from './layouts/CustomerLayout.js';
import { AdminLayout } from './layouts/AdminLayout.js';

// Auth Pages
import { CustomerLogin } from './features/auth/CustomerLogin.js';
import { CustomerRegister } from './features/auth/CustomerRegister.js';
import { AdminLogin } from './features/auth/AdminLogin.js';

// Customer Pages
import { ChatPage } from './features/chat/ChatPage.js';
import { ConversationsPage } from './features/customer/ConversationsPage.js';
import { OrdersPage } from './features/customer/OrdersPage.js';
import { TicketsPage } from './features/customer/TicketsPage.js';
import { ProfilePage } from './features/customer/ProfilePage.js';

// Admin Pages
import { DashboardPage } from './features/admin/DashboardPage.js';
import { AdminCustomersPage } from './features/customers/AdminCustomersPage.js';
import { CustomerDetailPage } from './features/customers/CustomerDetailPage.js';
import { AdminProductsPage } from './features/products/AdminProductsPage.js';
import { AdminOrdersPage } from './features/orders/AdminOrdersPage.js';
import { AdminConversationsPage } from './features/conversations/AdminConversationsPage.js';
import { AdminTicketsPage } from './features/tickets/AdminTicketsPage.js';
import { AdminKnowledgePage } from './features/knowledge/AdminKnowledgePage.js';
import { AdminFaqsPage } from './features/faqs/AdminFaqsPage.js';
import { AdminAgentsPage } from './features/agents/AdminAgentsPage.js';
import { AdminAiConfigPage } from './features/ai-config/AdminAiConfigPage.js';
import { AdminAuditLogsPage } from './features/audit/AdminAuditLogsPage.js';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<CustomerLogin />} />
      <Route path="/register" element={<CustomerRegister />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Customer Portal Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Admin / Operations Portal Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPPORT_AGENT']} adminPortal>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="conversations" element={<AdminConversationsPage />} />
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="knowledge" element={<AdminKnowledgePage />} />
        <Route path="faqs" element={<AdminFaqsPage />} />

        {/* Admin-only Routes */}
        <Route
          path="agents"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} adminPortal>
              <AdminAgentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="ai-config" element={<AdminAiConfigPage />} />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} adminPortal>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
};
