import { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

export default function BeatCard({ beat, onPlay, isPlaying }) {
  const [isLiked, setIsLiked] = useState(false);

  const handlePlayClick = (e) => {
    e.preventDefault();
    onPlay(beat);
  };

  const handleLikeClick = (e) => {
    e.preventDefault();
    setIsLiked(!isLiked);
    // TODO: Call API to like/unlike beat
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <div className="group bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-primary-500">
      {/* Cover Art with Play Overlay */}
      <div className="relative aspect-square bg-gray-200 overflow-hidden">
        {beat.cover_art_url ? (
          <img
            src={beat.cover_art_url}
            alt={beat.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-secondary-500">
            <svg
              className="w-20 h-20 text-white opacity-50"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
          <button
            onClick={handlePlayClick}
            className="transform scale-0 group-hover:scale-100 transition-transform duration-300 bg-white rounded-full p-4 shadow-lg hover:bg-primary-500 hover:text-white"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 ml-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Beat Info */}
      <div className="p-4">
        {/* Title and Producer */}
        <div className="mb-2">
          <Link
            to={`/beats/${beat.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-primary-600 line-clamp-1"
          >
            {beat.title}
          </Link>
          <Link
            to={`/producer/${beat.producer_id}`}
            className="text-sm text-gray-600 hover:text-primary-600 flex items-center mt-1"
          >
            by {beat.producer_name || "Unknown Producer"}
            <button
              onClick={handleLikeClick}
              className="ml-auto"
              aria-label="Like beat"
            >
              <svg
                className={`w-5 h-5 transition-colors ${
                  isLiked
                    ? "fill-red-500 text-red-500"
                    : "fill-none text-gray-400 hover:text-red-500"
                }`}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </Link>
        </div>

        {/* Genre and BPM */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          {beat.genre && (
            <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {beat.genre}
            </span>
          )}
          {beat.bpm && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
              {beat.bpm} BPM
            </span>
          )}
        </div>

        {/* Duration and Key */}
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          {beat.duration && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              {formatDuration(beat.duration)}
            </span>
          )}
          {beat.key_signature && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              {beat.key_signature}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-3">
          <p className="text-xl font-bold text-primary-600">
            {beat.base_price ? formatPrice(beat.base_price) : "Free"}
          </p>
          {beat.base_price && (
            <p className="text-xs text-gray-500">Starting price</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            to={`/beats/${beat.id}`}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium text-center transition-colors"
          >
            View Licenses
          </Link>
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Add to cart"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

BeatCard.propTypes = {
  beat: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    producer_id: PropTypes.number,
    producer_name: PropTypes.string,
    cover_art_url: PropTypes.string,
    genre: PropTypes.string,
    bpm: PropTypes.number,
    key_signature: PropTypes.string,
    duration: PropTypes.number,
    base_price: PropTypes.number,
  }).isRequired,
  onPlay: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool,
};

BeatCard.defaultProps = {
  isPlaying: false,
};
