import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { PaystackReturnPage } from "./pages/PaystackReturnPage";
import { OrderPage } from "./pages/OrderPage";
import { OrderReceiptPage, RepairReceiptPage } from "./pages/ReceiptPages";
import { TrackOrderPage } from "./pages/TrackOrderPage";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./pages/AuthPages";
import { AccountPage } from "./pages/AccountPage";
import { RepairsPage, RepairBookPage, RepairStatusPage } from "./pages/RepairsPages";
import { ImeiCheckPage } from "./pages/ImeiCheckPage";
import {
  AboutPage,
  ContactPage,
  ShippingPage,
  ReturnsPage,
  PrivacyPage,
  TermsPage,
  FaqPage,
  PickupPage,
  NotFoundPage,
} from "./pages/InfoPages";
import {
  StaffLayout,
  StaffDashboard,
  StaffOrders,
  StaffProducts,
  StaffRepairs,
  StaffRepairServices,
  StaffCategories,
  StaffUsers,
  StaffMessages,
} from "./pages/StaffPages";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="account/repairs" element={<AccountPage />} />
            <Route path="repairs" element={<RepairsPage />} />
            <Route path="repairs/book" element={<RepairBookPage />} />
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
            <Route path="staff" element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="orders" element={<StaffOrders />} />
              <Route path="products" element={<StaffProducts />} />
              <Route path="repairs" element={<StaffRepairs />} />
              <Route path="services" element={<StaffRepairServices />} />
              <Route path="messages" element={<StaffMessages />} />
              <Route path="categories" element={<StaffCategories />} />
              <Route path="users" element={<StaffUsers />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
