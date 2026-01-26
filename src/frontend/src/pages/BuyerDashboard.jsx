import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <img
                src="/afro-jamz.png"
                alt="AfroJamz"
                className="w-10 h-10 rounded-lg"
              />
              <h1 className="text-2xl font-bold bg-linear-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                AfroJamz - Buyer
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome, {user?.username}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Buyer dashboard coming soon...
        </p>
      </div>
    </div>
  );
}
