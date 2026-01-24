import { useState, useEffect, useCallback } from "react";
import { beatsAPI } from "../api/beats";
import BeatGrid from "../components/BeatGrid";
import AudioPlayer from "../components/AudioPlayer";
import CurrencySelector from "../components/CurrencySelector";
import FilterSidebar from "../components/FilterSidebar";
import { useCurrency } from "../hooks/useCurrency";
import { convertCurrency } from "../utils/currency";

export default function BrowseBeats() {
  const [beats, setBeats] = useState([]);
  const [filteredBeats, setFilteredBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBeat, setCurrentBeat] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { currency } = useCurrency();

  useEffect(() => {
    fetchBeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await beatsAPI.getAll({
        page,
        limit: 20,
      });

      if (page === 1) {
        setBeats(data.beats || []);
      } else {
        setBeats((prev) => [...prev, ...(data.beats || [])]);
      }

      setHasMore((data.beats || []).length === 20);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load beats");
      console.error("Error fetching beats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayBeat = (beat) => {
    if (currentBeat?.id === beat.id) {
      setCurrentBeat(null); // Stop playback
    } else {
      setCurrentBeat(beat); // Start playing this beat
    }
  };

  const handleNextBeat = () => {
    if (!currentBeat) return;
    const currentIndex = beats.findIndex((b) => b.id === currentBeat.id);
    if (currentIndex < beats.length - 1) {
      setCurrentBeat(beats[currentIndex + 1]);
    }
  };

  const handlePreviousBeat = () => {
    if (!currentBeat) return;
    const currentIndex = beats.findIndex((b) => b.id === currentBeat.id);
    if (currentIndex > 0) {
      setCurrentBeat(beats[currentIndex - 1]);
    }
  };

  const handleBeatEnded = () => {
    handleNextBeat(); // Auto-play next beat
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Filter beats based on selected filters and search query
  const applyFilters = useCallback(() => {
    let filtered = [...beats];

    // Search filter (title and producer name)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (beat) =>
          beat.title.toLowerCase().includes(query) ||
          (beat.producer_name &&
            beat.producer_name.toLowerCase().includes(query)),
      );
    }

    // Genre filter
    if (filters.genres && filters.genres.length > 0) {
      filtered = filtered.filter((beat) => filters.genres.includes(beat.genre));
    }

    // BPM filter
    if (filters.minBpm !== "" && filters.minBpm !== undefined) {
      filtered = filtered.filter(
        (beat) => beat.bpm >= parseInt(filters.minBpm, 10),
      );
    }
    if (filters.maxBpm !== "" && filters.maxBpm !== undefined) {
      filtered = filtered.filter(
        (beat) => beat.bpm <= parseInt(filters.maxBpm, 10),
      );
    }

    // Key filter
    if (filters.keys && filters.keys.length > 0) {
      filtered = filtered.filter((beat) => filters.keys.includes(beat.key));
    }

    // Price filter (convert to USD for comparison since backend stores in USD)
    if (filters.minPrice !== "" && filters.minPrice !== undefined) {
      const minPriceUSD =
        parseFloat(filters.minPrice) /
        (currency === "USD" ? 1 : convertCurrency(1, currency));
      filtered = filtered.filter((beat) => beat.min_price >= minPriceUSD);
    }
    if (filters.maxPrice !== "" && filters.maxPrice !== undefined) {
      const maxPriceUSD =
        parseFloat(filters.maxPrice) /
        (currency === "USD" ? 1 : convertCurrency(1, currency));
      filtered = filtered.filter((beat) => beat.min_price <= maxPriceUSD);
    }

    setFilteredBeats(filtered);
  }, [beats, filters, searchQuery, currency]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Browse Beats
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                Discover the hottest Afrobeats, Amapiano, and more
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600">
                Currency:
              </span>
              <CurrencySelector />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search beats by title or producer..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex gap-4 lg:gap-8">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden fixed bottom-20 right-4 z-20">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors"
              aria-label="Toggle filters"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>

          {/* Filter Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-48">
              <FilterSidebar onFilterChange={handleFilterChange} />
            </div>
          </aside>

          {/* Filter Sidebar - Mobile Overlay */}
          {showMobileFilters && (
            <div className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50">
              <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Filters
                  </h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <FilterSidebar onFilterChange={handleFilterChange} />
              </div>
            </div>
          )}

          {/* Beats Grid */}
          <main className="flex-1 pb-32">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {loading && page === 1 ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* Results count */}
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {searchQuery &&
                    filteredBeats.length === 0 &&
                    beats.length > 0
                      ? `No results for "${searchQuery}"`
                      : filteredBeats.length === beats.length
                        ? `${beats.length} beats found`
                        : `${filteredBeats.length} of ${beats.length} beats`}
                  </p>
                </div>

                <BeatGrid
                  beats={filteredBeats}
                  onPlayBeat={handlePlayBeat}
                  currentlyPlayingId={currentBeat?.id}
                />

                {/* No results message */}
                {filteredBeats.length === 0 && beats.length > 0 && (
                  <div className="text-center py-20">
                    <svg
                      className="w-16 h-16 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No beats match your filters
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filter criteria
                    </p>
                  </div>
                )}

                {/* Load More Button */}
                {hasMore && beats.length > 0 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? "Loading..." : "Load More Beats"}
                    </button>
                  </div>
                )}

                {!hasMore && beats.length > 0 && (
                  <p className="text-center text-gray-500 mt-8 mb-8">
                    You've reached the end!
                  </p>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Audio Player */}
      {currentBeat && (
        <AudioPlayer
          currentBeat={currentBeat}
          onEnded={handleBeatEnded}
          onNext={handleNextBeat}
          onPrevious={handlePreviousBeat}
        />
      )}
    </div>
  );
}
