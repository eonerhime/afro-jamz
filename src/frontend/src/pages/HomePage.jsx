import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">AfroJamz</h1>
            <div className="flex gap-4">
              <Link to="/beats" className="text-gray-700 hover:text-indigo-600">
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
                    className="text-gray-700 hover:text-indigo-600"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-indigo-600"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Discover & Buy African Beats
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            The premier marketplace for African music producers and creators
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/beats"
              className="bg-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-indigo-700"
            >
              Browse Beats
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-md text-lg font-medium hover:bg-indigo-50"
              >
                Start Selling
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
