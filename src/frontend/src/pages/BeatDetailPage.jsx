import { useState } from "react";
import AudioPlayer from "react-h5-audio-player";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function BeatDetailPage() {
  const location = useLocation();
  const beat = location.state?.beat;
  const fromPage = location.state?.from;
  const licenses = location.state?.beatLicenses || [];
  let currentBeat;

  // Get the license with the lowest price
  const lowestPriceLicense =
    licenses.length > 0
      ? licenses.reduce((min, license) =>
          license.price < min.price ? license : min,
        )
      : null;
  const [selectedLicense, setSelectedLicense] = useState(lowestPriceLicense);

  console.log("BeatDetailPage - beat data:", beat);
  console.log("From page:", fromPage);
  console.log("Beat licenses:", licenses);

  const back = `/${
    fromPage.split(" ").length === 1
      ? fromPage.toLowerCase()
      : fromPage.split(" ")[1].toLowerCase()
  }`;

  const handleNextBeat = () => {
    if (currentBeat.length === 1) return;
  };

  const handlePreviousBeat = () => {
    if (currentBeat.length === 1) return;
  };

  const handleBeatEnded = () => {
    handleNextBeat(); // Auto-play next beat
  };

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
        ? `${beat.genre} beat by ${beat.producer_name}. BPM: ${beat.bpm}, Key: ${beat.key}. ${beat.description || "Premium African beat for sale."}`
        : "Premium African beat for sale.",
      image: imageUrl,
      url: window.location.href,
      type: "music.song",
      price: beat?.min_price || 0,
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
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No beat data found. Please select a beat from the list.
            </p>
            <Link
              to={back}
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Back to {fromPage}
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header with Back Button and Theme Toggle */}
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <Link
              to={back}
              className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-2 text-sm sm:text-base"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
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
              Back to {fromPage}
            </Link>
            <ThemeToggle />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-8 lg:gap-12 items-start">
            {/* Left Column: Beat Cover Art + Icons */}
            <div className="flex flex-col items-center w-full space-y-4 sm:space-y-6">
              {/* Cover Art */}
              <div className="aspect-square w-full max-w-md lg:max-w-none bg-linear-to-br from-orange-400 to-pink-500 rounded-lg overflow-hidden shadow-lg">
                {beat.cover_art_url ? (
                  <img
                    src={`${API_BASE_URL}${beat.cover_art_url}`}
                    alt={beat.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-24 h-24 sm:w-32 sm:h-32 text-white/80"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Icon Row - Mobile Optimized */}
              <div className="flex justify-center items-center gap-3 sm:gap-4 md:gap-6 w-full">
                {/* Heart (Like) with count */}
                <button
                  className="flex flex-col items-center group relative min-w-15 sm:min-w-17.5"
                  aria-label="Like this beat"
                >
                  <div className="p-2 sm:p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-95">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 sm:w-7 sm:h-7 text-red-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.239-4.5-5-4.5-1.657 0-3.156.832-4 2.086C10.156 4.582 8.657 3.75 7 3.75c-2.761 0-5 2.015-5 4.5 0 7.25 10 12.5 10 12.5s10-5.25 10-12.5z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium">
                    123
                  </span>
                  {/* Tooltip - Hidden on mobile, shown on desktop */}
                  <span className="hidden lg:block absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap transition-opacity pointer-events-none">
                    Like this beat
                  </span>
                </button>

                {/* Thumbs-up (Ranking) with rank number */}
                <button
                  className="flex flex-col items-center group relative min-w-15 sm:min-w-17.5"
                  aria-label="Beat ranking"
                >
                  <div className="p-2 sm:p-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium">
                    #7
                  </span>
                  {/* Tooltip - Hidden on mobile, shown on desktop */}
                  <span className="hidden lg:block absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap transition-opacity pointer-events-none">
                    Beat ranking
                  </span>
                </button>

                {/* Plus (Add to Playlist) */}
                <button
                  className="flex flex-col items-center group relative min-w-15 sm:min-w-17.5"
                  aria-label="Add to playlist"
                >
                  <div className="p-2 sm:p-3 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors active:scale-95">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 sm:w-7 sm:h-7 text-green-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </div>
                  {/* Tooltip - Hidden on mobile, shown on desktop */}
                  <span className="hidden lg:block absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap transition-opacity pointer-events-none">
                    Add to playlist
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium">
                    &nbsp;
                  </span>
                </button>

                {/* Share (Social Sharing) */}
                <button
                  className="flex flex-col items-center group relative min-w-15 sm:min-w-17.5"
                  aria-label="Share this beat"
                >
                  <div className="p-2 sm:p-3 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors active:scale-95">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500 group-hover:scale-110 transition-transform"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                      />
                    </svg>
                  </div>
                  {/* Tooltip - Hidden on mobile, shown on desktop */}
                  <span className="hidden lg:block absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap transition-opacity pointer-events-none">
                    Share this beat
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium">
                    &nbsp;
                  </span>
                </button>
              </div>

              {/* Beat Tags*/}
              <div className="flex justify-center items-center gap-3 sm:gap-4 md:gap-6 w-full">
                {beat.tags.split(",").map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium px-3 py-1 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: Beat Details */}
            <div className="space-y-6 sm:space-y-8 w-full">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {beat.title}
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
                  by {beat.producer_name}
                </p>
              </div>

              {beat.description && (
                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
                  {beat.description}
                </p>
              )}

              {/* Beat Metadata */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Genre
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {beat.genre}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    BPM
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {beat.bpm}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Key
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {beat.key}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Price
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    ${selectedLicense.price.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              {/* License Selection */}
              {licenses.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6">
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3">
                    Select License
                  </label>
                  <select
                    value={selectedLicense?.license_id || ""}
                    onChange={(e) => {
                      const selected = licenses.find(
                        (l) => l.license_id === Number(e.target.value),
                      );
                      setSelectedLicense(selected);
                    }}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors text-sm sm:text-base"
                  >
                    {licenses.map((license) => (
                      <option
                        key={license.license_id}
                        value={license.license_id}
                      >
                        {license.name}
                        {/* - ${license.price.toLocaleString("en-US")} */}
                      </option>
                    ))}
                  </select>

                  {/* Selected License Details */}
                  {selectedLicense && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="mb-2">
                        <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                          {/* ${selectedLicense.price} */}
                          License Details
                        </p>
                      </div>
                      <div className="mb-2">
                        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                          {selectedLicense.description}
                        </p>
                      </div>
                      {selectedLicense.usage_rights && (
                        <div className="flex items-start gap-2">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            Usage Rights: {selectedLicense.usage_rights}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Player Placeholder */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Preview
                </p>
                <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  <AudioPlayer
                    currentBeat={currentBeat}
                    onEnded={handleBeatEnded}
                    onNext={handleNextBeat}
                    onPrevious={handlePreviousBeat}
                    src={
                      beat.preview_url
                        ? `${API_BASE_URL}${beat.preview_url}`
                        : null
                    }
                    onPlay={() => console.log("Playing preview")}
                    volume={0.1}
                    className="h-12 w-36"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-base sm:text-lg">
                  Purchase Beat
                </button>
                <button className="flex-1 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors text-base sm:text-lg">
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
