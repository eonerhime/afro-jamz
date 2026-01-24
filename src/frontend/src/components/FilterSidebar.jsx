import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useCurrency } from "../hooks/useCurrency";

export default function FilterSidebar({ onFilterChange, initialFilters = {} }) {
  const { currency } = useCurrency();
  const [filters, setFilters] = useState({
    genres: initialFilters.genres || [],
    minBpm: initialFilters.minBpm || "",
    maxBpm: initialFilters.maxBpm || "",
    keys: initialFilters.keys || [],
    minPrice: initialFilters.minPrice || "",
    maxPrice: initialFilters.maxPrice || "",
  });

  const [expandedSections, setExpandedSections] = useState({
    genre: true,
    bpm: true,
    key: false,
    price: true,
  });

  // Available filter options
  const GENRES = [
    "Afrobeats",
    "Amapiano",
    "Afro-fusion",
    "Afro-pop",
    "Afroswing",
    "Highlife",
    "Dancehall",
    "Hip-Hop",
    "R&B",
  ];

  const KEYS = [
    "C Major",
    "C Minor",
    "D Major",
    "D Minor",
    "E Major",
    "E Minor",
    "F Major",
    "F Minor",
    "G Major",
    "G Minor",
    "A Major",
    "A Minor",
    "B Major",
    "B Minor",
  ];

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleGenreToggle = (genre) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleKeyToggle = (key) => {
    setFilters((prev) => ({
      ...prev,
      keys: prev.keys.includes(key)
        ? prev.keys.filter((k) => k !== key)
        : [...prev.keys, key],
    }));
  };

  const handleBpmChange = (type, value) => {
    const numValue = value === "" ? "" : parseInt(value, 10);
    setFilters((prev) => ({
      ...prev,
      [type]: numValue,
    }));
  };

  const handlePriceChange = (type, value) => {
    const numValue = value === "" ? "" : parseFloat(value);
    setFilters((prev) => ({
      ...prev,
      [type]: numValue,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      genres: [],
      minBpm: "",
      maxBpm: "",
      keys: [],
      minPrice: "",
      maxPrice: "",
    });
  };

  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.keys.length > 0 ||
    filters.minBpm !== "" ||
    filters.maxBpm !== "" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-gray-200">
        {/* Genre Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection("genre")}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-medium text-gray-900">Genre</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedSections.genre ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.genre && (
            <div className="mt-3 space-y-2">
              {GENRES.map((genre) => (
                <label
                  key={genre}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(genre)}
                    onChange={() => handleGenreToggle(genre)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {genre}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* BPM Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection("bpm")}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-medium text-gray-900">BPM (Tempo)</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedSections.bpm ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.bpm && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Minimum
                </label>
                <input
                  type="number"
                  min="60"
                  max="200"
                  value={filters.minBpm}
                  onChange={(e) => handleBpmChange("minBpm", e.target.value)}
                  placeholder="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Maximum
                </label>
                <input
                  type="number"
                  min="60"
                  max="200"
                  value={filters.maxBpm}
                  onChange={(e) => handleBpmChange("maxBpm", e.target.value)}
                  placeholder="200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Key Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection("key")}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-medium text-gray-900">Key</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedSections.key ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.key && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.keys.includes(key)}
                    onChange={() => handleKeyToggle(key)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {key}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection("price")}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-medium text-gray-900">
              Price ({currency})
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedSections.price ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expandedSections.price && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Minimum
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minPrice}
                  onChange={(e) =>
                    handlePriceChange("minPrice", e.target.value)
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Maximum
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    handlePriceChange("maxPrice", e.target.value)
                  }
                  placeholder="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">
                Prices are in {currency}. Converted from USD.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

FilterSidebar.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
  initialFilters: PropTypes.shape({
    genres: PropTypes.arrayOf(PropTypes.string),
    minBpm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    maxBpm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    keys: PropTypes.arrayOf(PropTypes.string),
    minPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    maxPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};
