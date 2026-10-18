import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { PaystackReturnPage } from "./pages/PaystackReturnPage";
import { OrderPage } from "./pages/OrderPage";
import { TrackOrderPage } from "./pages/TrackOrderPage";
import { TrackSharePage } from "./pages/TrackSharePage";
import { RepairsPage, RepairBookPage, RepairStatusPage } from "./pages/RepairsPages";
import {
  AboutPage,
  ContactPage,
  ShippingPage,
  ReturnsPage,
  PrivacyPage,
  TermsPage,
  FaqPage,
  PickupPage,
  RepairWarrantyPage,
  RepairHowWeQuotePage,
  WholesalePage,
  NotFoundPage,
} from "./pages/InfoPages";

const OrderReceiptPage = lazy(() =>
  import("./pages/ReceiptPages").then((m) => ({ default: m.OrderReceiptPage })),
);
const RepairReceiptPage = lazy(() =>
  import("./pages/ReceiptPages").then((m) => ({ default: m.RepairReceiptPage })),
);
const LoginPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() =>
  import("./pages/AuthPages").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/AuthPages").then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/AuthPages").then((m) => ({ default: m.VerifyEmailPage })),
);
const AccountPage = lazy(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const ImeiCheckPage = lazy(() => import("./pages/ImeiCheckPage").then((m) => ({ default: m.ImeiCheckPage })));
const StaffLayout = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffLayout })));
const StaffDashboard = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffDashboard })));
const StaffOrders = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffOrders })));
const StaffReturns = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffReturns })));
const StaffAuditLogs = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffAuditLogs })));
const StaffProducts = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffProducts })));
const StaffRepairs = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffRepairs })));
const StaffRepairServices = lazy(() =>
  import("./pages/staff").then((m) => ({ default: m.StaffRepairServices })),
);
const StaffCategories = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffCategories })));
const StaffUsers = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffUsers })));
const StaffMessages = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffMessages })));
const StaffSettings = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffSettings })));
const StaffPos = lazy(() => import("./pages/staff").then((m) => ({ default: m.StaffPos })));

function RouteFallback() {
  return (
    <div className="page container">
      <p className="meta">Loading…</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="product/:slug" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="checkout/paystack-return" element={<PaystackReturnPage />} />
              <Route path="order/:id" element={<OrderPage />} />
              <Route path="order/:id/receipt" element={<OrderReceiptPage />} />
              <Route path="track" element={<TrackOrderPage />} />
              <Route path="track/t/:token" element={<TrackSharePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="account/repairs" element={<AccountPage />} />
              <Route path="repairs" element={<RepairsPage />} />
              <Route path="repairs/book" element={<RepairBookPage />} />
              <Route path="repairs/warranty" element={<RepairWarrantyPage />} />
              <Route path="repairs/how-we-quote" element={<RepairHowWeQuotePage />} />
              <Route path="repairs/status/:id" element={<RepairStatusPage />} />
              <Route path="repairs/status/:id/receipt" element={<RepairReceiptPage />} />
              <Route path="imei-check" element={<ImeiCheckPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="shipping" element={<ShippingPage />} />
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="pickup" element={<PickupPage />} />
              <Route path="wholesale" element={<WholesalePage />} />
              <Route path="staff" element={<StaffLayout />}>
                <Route index element={<StaffDashboard />} />
                <Route path="orders" element={<StaffOrders />} />
                <Route path="returns" element={<StaffReturns />} />
                <Route path="audit" element={<StaffAuditLogs />} />
                <Route path="pos" element={<StaffPos />} />
                <Route path="products" element={<StaffProducts />} />
                <Route path="repairs" element={<StaffRepairs />} />
                <Route path="services" element={<StaffRepairServices />} />
                <Route path="messages" element={<StaffMessages />} />
                <Route path="settings" element={<StaffSettings />} />
                <Route path="categories" element={<StaffCategories />} />
                <Route path="users" element={<StaffUsers />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  );
}
