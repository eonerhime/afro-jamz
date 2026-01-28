import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function BeatDetailPage() {
  const location = useLocation();
  const beat = location.state?.beat;

  // Generate meta tags data
  const getMetaTags = () => {
    const baseUrl = window.location.origin;
    const imageUrl = beat?.cover_art_url
      ? `${API_BASE_URL}${beat.cover_art_url}`
      : `${baseUrl}/afro-jamz.png`;
    return {
      title: beat
        ? `${beat.title} - ${beat.producer_name || "AfroJamz"}`
        : "AfroJamz Beat Detail",
      description: beat
        ? `${beat.genre} beat by ${beat.producer_name}. BPM: ${beat.bpm}, Key: ${beat.musical_key}. ${beat.description || "Premium African beat for sale."}`
        : "Premium African beat for sale.",
      image: imageUrl,
      url: window.location.href,
      type: "music.song",
      price: beat?.price || 0,
      currency: beat?.currency || "USD",
    };
  };

  const metaTags = getMetaTags();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{metaTags.title}</title>
        <meta name="description" content={metaTags.description} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content={metaTags.type} />
        <meta property="og:title" content={metaTags.title} />
        <meta property="og:description" content={metaTags.description} />
        <meta property="og:image" content={metaTags.image} />
        <meta property="og:url" content={metaTags.url} />
        <meta property="og:site_name" content="AfroJamz" />

        {/* Music-specific Open Graph tags */}
        {beat && (
          <meta property="music:musician" content={beat.producer_name} />
        )}
        {beat && (
          <meta property="music:duration" content={beat.duration || "0"} />
        )}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@AfroJamz" />
        <meta name="twitter:title" content={metaTags.title} />
        <meta name="twitter:description" content={metaTags.description} />
        <meta name="twitter:image" content={metaTags.image} />

        {/* Additional metadata */}
        <meta property="product:price:amount" content={metaTags.price} />
        <meta property="product:price:currency" content={metaTags.currency} />
      </Helmet>

      {!beat ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No beat data found. Please select a beat from the list.
            </p>
            <Link
              to="/beats"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Back to Browse
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <Link
              to="/browse"
              className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-2"
              style={{ marginLeft: 0 }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Browse
            </Link>
            <ThemeToggle />
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-[30%_1fr] gap-12 items-start"
            style={{ alignItems: "flex-start" }}
          >
            {/* Left Column: Beat Cover Art + Icons */}
            <div className="flex flex-col items-center w-full space-y-6">
              {/* Cover Art */}
              <div className="aspect-square w-full bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg overflow-hidden shadow-lg">
                {beat.cover_art_url ? (
                  <img
                    src={`${API_BASE_URL}${beat.cover_art_url}`}
                    alt={beat.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-32 h-32 text-white/80"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Icon Row */}
              <div className="flex justify-center items-center gap-6 w-full">
                {/* Heart (Like) with count */}
                <div className="flex flex-col items-center group relative">
                  <button
                    className="p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Like this beat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-7 h-7 text-red-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.239-4.5-5-4.5-1.657 0-3.156.832-4 2.086C10.156 4.582 8.657 3.75 7 3.75c-2.761 0-5 2.015-5 4.5 0 7.25 10 12.5 10 12.5s10-5.25 10-12.5z"
                      />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    123
                  </span>
                  {/* Tooltip */}
                  <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    Like this beat
                  </span>
                </div>

                {/* Thumbs-up (Ranking) with rank number */}
                <div className="flex flex-col items-center group relative">
                  <button
                    className="p-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    aria-label="Beat ranking"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-7 h-7 text-blue-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                      />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                    #7
                  </span>
                  {/* Tooltip */}
                  <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    Beat ranking
                  </span>
                </div>

                {/* Plus (Add to Playlist) */}
                <div className="flex flex-col items-center group relative">
                  <button
                    className="p-3 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    aria-label="Add to playlist"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-7 h-7 text-green-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </button>
                  {/* Tooltip */}
                  <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    Add to playlist
                  </span>
                </div>

                {/* Share (Social Sharing) */}
                <div className="flex flex-col items-center group relative">
                  <button
                    className="p-3 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    aria-label="Share this beat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-7 h-7 text-purple-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                      />
                    </svg>
                  </button>
                  {/* Tooltip */}
                  <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    Share this beat
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Beat Details */}
            <div className="space-y-8 w-full" style={{ paddingRight: 0 }}>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {beat.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  by {beat.producer_name}
                </p>
              </div>

              {beat.description && (
                <p className="text-gray-700 dark:text-gray-300">
                  {beat.description}
                </p>
              )}

              {/* Beat Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Genre
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {beat.genre}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    BPM
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {beat.bpm}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Key
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {beat.musical_key}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Price
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${beat.price}
                  </p>
                </div>
              </div>

              {/* Audio Player Placeholder */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Preview
                </p>
                <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500">
                    Audio player coming soon
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Purchase Beat
                </button>
                <button className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
