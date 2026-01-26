import { useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useCurrency } from "../hooks/useCurrency";
import {
  convertCurrency,
  formatPrice as formatCurrencyPrice,
} from "../utils/currency";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function BeatCard({ beat, onPlay, isPlaying }) {
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { currency } = useCurrency();

  const handlePlayClick = (e) => {
    e.preventDefault();
    onPlay(beat);
  };

  const handleLikeClick = (e) => {
    e.preventDefault();
    setIsLiked(!isLiked);
    // TODO: Call API to like/unlike beat
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    // If duration is already a string (e.g., '3:30'), return it
    if (typeof duration === "string") return duration;
    // Otherwise format from seconds
    if (isNaN(duration)) return "0:00";
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (usdPrice) => {
    if (!usdPrice || isNaN(usdPrice)) return "Free";
    const convertedPrice = convertCurrency(usdPrice, currency);
    return formatCurrencyPrice(convertedPrice, currency);
  };

  // Construct full image URL
  const imageUrl = `${API_BASE_URL}${beat.cover_art_url}`;

  console.log("Beat:", beat.title, "Image URL:", imageUrl);

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 z-0">
      {/* Cover Art with Play Overlay */}
      <div
        className="relative w-full overflow-hidden bg-linear-to-br from-primary-100 to-secondary-100"
        style={{ paddingBottom: "100%" }}
      >
        {beat.cover_art_url && (
          <img
            src={imageUrl}
            alt={beat.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 z-0"
            onLoad={() => console.log("Image loaded successfully:", imageUrl)}
            onError={(e) => {
              console.error("Image load failed for:", e.target.src);
              setImageError(true);
            }}
          />
        )}

        {/* Fallback icon if no image */}
        {(!beat.cover_art_url || imageError) && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <svg
              className="w-20 h-20 text-primary-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={handlePlayClick}
            className="pointer-events-auto cursor-pointer transform scale-0 group-hover:scale-100 transition-transform duration-300 bg-primary-500 text-white rounded-full p-4 shadow-lg hover:bg-primary-600 hover:scale-110"
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
            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1"
          >
            {beat.title}
          </Link>
          <Link
            to={`/producer/${beat.producer_id}`}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center mt-1"
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
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          {beat.genre && (
            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-medium">
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
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
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
        <div className="mb-4">
          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {beat.min_price ? formatPrice(beat.min_price) : "Free"}
          </p>
          {beat.min_price && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Starting price
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            to={`/beats/${beat.id}`}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-center transition-colors cursor-pointer"
          >
            View Licenses
          </Link>
          <button
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            aria-label="Add to cart"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
    min_price: PropTypes.number,
  }).isRequired,
  onPlay: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool,
};

BeatCard.defaultProps = {
  isPlaying: false,
};
