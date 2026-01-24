import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages (will create these next)
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import BrowseBeats from "./pages/BrowseBeats";
import BeatDetailPage from "./pages/BeatDetailPage";
import ProducerDashboard from "./pages/ProducerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";

function App() {
  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/beats" element={<BrowseBeats />} />
            <Route path="/beats/:id" element={<BeatDetailPage />} />

            {/* Producer routes */}
            <Route
              path="/producer/dashboard"
              element={
                <ProtectedRoute requiredRole="producer">
                  <ProducerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Buyer routes */}
            <Route
              path="/buyer/dashboard"
              element={
                <ProtectedRoute requiredRole="buyer">
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
