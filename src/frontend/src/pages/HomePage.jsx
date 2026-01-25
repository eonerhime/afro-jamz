import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 via-secondary-50 to-accent-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <img
                src="/afro-jamz.png"
                alt="AfroJamz"
                className="w-10 h-10 rounded-lg"
              />
              <h1 className="text-2xl font-bold text-primary-600">
                AfroJamz
              </h1>
            </div>
            <div className="flex gap-6 items-center">
              <Link
                to="/beats"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                Browse Beats
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to={
                      user?.role === "producer"
                        ? "/producer/dashboard"
                        : "/buyer/dashboard"
                    }
                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-linear-to-r from-primary-500 to-secondary-500 text-white px-6 py-2 rounded-lg hover:from-primary-600 hover:to-secondary-600 font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold mb-6 text-gray-900">
            Where African Beats
            <br />
            Meet The World
          </h2>
          <p className="text-2xl text-gray-700 mb-10 max-w-3xl mx-auto">
            The premier marketplace connecting African music producers with
            creators worldwide
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <Link
              to="/beats"
              className="bg-linear-to-r from-primary-500 to-secondary-500 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:from-primary-600 hover:to-secondary-600 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
            >
              🎵 Explore Beats
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="border-2 border-primary-500 text-primary-600 px-10 py-4 rounded-xl text-lg font-semibold hover:bg-primary-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
              >
                🎹 Start Selling
              </Link>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-t-4 border-primary-500">
            <div className="w-16 h-16 bg-linear-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Instant Licensing
            </h3>
            <p className="text-gray-600">
              Clear, transparent licenses for every beat. Download immediately
              after purchase with full legal rights.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-t-4 border-secondary-500">
            <div className="w-16 h-16 bg-linear-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Secure Payments
            </h3>
            <p className="text-gray-600">
              Wallet system with escrow protection. Funds released after 7 days.
              Instant PayPal withdrawals for producers.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-t-4 border-accent-500">
            <div className="w-16 h-16 bg-linear-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Quality Curated
            </h3>
            <p className="text-gray-600">
              Every beat from verified African producers. Support authentic
              sounds from Afrobeats to Amapiano and beyond.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-linear-to-r from-primary-500 via-secondary-500 to-accent-500 rounded-3xl p-12 text-white shadow-2xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">1,000+</div>
              <div className="text-xl opacity-90">Premium Beats</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-xl opacity-90">Verified Producers</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">$50K+</div>
              <div className="text-xl opacity-90">Paid to Creators</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h3 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Find Your Sound?
          </h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who trust AfroJamz for authentic African
            beats
          </p>
          <Link
            to="/beats"
            className="inline-block bg-linear-to-r from-primary-500 to-secondary-500 text-white px-12 py-4 rounded-xl text-xl font-semibold hover:from-primary-600 hover:to-secondary-600 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
          >
            Start Browsing Now →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-24 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="/afro-jamz.png"
              alt="AfroJamz"
              className="w-8 h-8 rounded-lg"
            />
            <span className="text-xl font-bold">AfroJamz</span>
          </div>
          <p className="text-gray-400">
            © 2026 AfroJamz. Empowering African music producers worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}
