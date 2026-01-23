import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ProducerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">
              AfroJamz - Producer
            </h1>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-indigo-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome, {user?.username}!
        </h2>
        <p className="text-gray-600">Producer dashboard coming soon...</p>
      </div>
    </div>
  );
}
