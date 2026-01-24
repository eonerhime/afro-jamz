import { useState, useEffect } from "react";
import { beatsAPI } from "../api/beats";
import BeatGrid from "../components/BeatGrid";

export default function BrowseBeats() {
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchBeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await beatsAPI.getAllBeats({
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
    if (currentlyPlayingId === beat.id) {
      setCurrentlyPlayingId(null);
      // TODO: Pause audio
    } else {
      setCurrentlyPlayingId(beat.id);
      // TODO: Play audio
    }
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Browse Beats</h1>
          <p className="mt-2 text-gray-600">
            Discover the hottest Afrobeats, Amapiano, and more
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filter Sidebar Placeholder */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Filters
              </h2>
              <p className="text-sm text-gray-500">Filters coming soon...</p>
            </div>
          </aside>

          {/* Beats Grid */}
          <main className="flex-1">
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
                <BeatGrid
                  beats={beats}
                  onPlayBeat={handlePlayBeat}
                  currentlyPlayingId={currentlyPlayingId}
                />

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
                  <p className="text-center text-gray-500 mt-8 pb-8">
                    You've reached the end!
                  </p>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
