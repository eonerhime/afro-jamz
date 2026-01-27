import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import CurrencySelector from "../components/CurrencySelector";
import { licensesAPI } from "../api/licenses";
import { useCurrency } from "../hooks/useCurrency";
import {
  convertCurrency,
  formatPrice as formatCurrencyPrice,
} from "../utils/currency";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function BeatDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const beat = location.state?.beat;
  const { currency, setCurrency } = useCurrency();
  const [licenses, setLicenses] = useState([]);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [audioUrl, setAudioUrl] = useState(
    beat?.audio_url ? `${API_BASE_URL}${beat.audio_url}` : "",
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Handle play/pause for audio preview
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying((prev) => !prev);
  };

  // Ensure isPlaying state syncs with audio element events
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, [audioRef]);

  useEffect(() => {
    if (beat?.id) {
      licensesAPI.getByBeatId(beat.id).then((data) => {
        setLicenses(data);
        if (data && data.length > 0) setSelectedLicense(data[0]);
      });
    }
  }, [beat?.id]);

  if (!beat) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600 dark:text-gray-400">Beat not found</p>
          <Link
            to="/browse"
            className="mt-4 inline-block text-orange-600 dark:text-orange-400 hover:underline"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = beat.cover_art_url
    ? `${API_BASE_URL}${beat.cover_art_url}`
    : `/afro-jamz.png`;

  // Format duration (handle NaN)
  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    if (typeof duration === "string") return duration;
    if (isNaN(duration)) return "0:00";
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format price using currency conversion
  const getFormattedPrice = (usdPrice) => {
    if (!usdPrice || isNaN(usdPrice)) return "Free";
    const converted = convertCurrency(usdPrice, currency);
    return formatCurrencyPrice(converted, currency);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        <title>{`${beat.title} - ${beat.producer_name || "AfroJamz"}`}</title>
        <meta
          name="description"
          content={beat.description || "Premium African beat for sale."}
        />
        <meta
          property="og:title"
          content={`${beat.title} - ${beat.producer_name || "AfroJamz"}`}
        />
        <meta
          property="og:description"
          content={beat.description || "Premium African beat for sale."}
        />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:type" content="music.song" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      {/* Header: Logo left, currency selector right */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-3 group">
            <img
              src="/afro-jamz.png"
              alt="AfroJamz"
              className="h-8 w-auto group-hover:opacity-80 transition"
            />
            <span className="hidden sm:inline text-lg font-bold text-gray-900 dark:text-white">
              Afro Jamz
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Currency:
            </span>
            <CurrencySelector />
          </div>
        </div>
      </div>

      {/* Back button below header, flush with logo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        <button
          onClick={() => navigate(-1)}
          className="text-orange-600 dark:text-orange-400 hover:underline font-medium flex items-center"
        >
          <span className="text-lg">&#8592;</span>
          <span className="ml-1">Back</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <img
            src={imageUrl}
            alt={beat.title}
            className="w-full md:w-64 h-64 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {beat.title}
            </h1>
            <div className="mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Producer:</span>{" "}
              {beat.producer_name}
            </div>
            <div className="mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Genre:</span> {beat.genre}
            </div>
            <div className="mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">BPM:</span> {beat.bpm}
            </div>
            <div className="mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Key:</span>{" "}
              {beat.key_signature || beat.musical_key}
            </div>
            <div className="mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Duration:</span>{" "}
              {formatDuration(beat.duration)}
            </div>
            <div className="mb-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Description:</span>{" "}
              {beat.description}
            </div>

            {/* License selection */}
            <div className="mb-4">
              <label className="block font-semibold mb-1">License:</label>
              <select
                className="w-full p-2 border rounded mb-2 dark:bg-gray-800 dark:text-white"
                value={selectedLicense?.license_id || ""}
                onChange={(e) => {
                  const lic = licenses.find(
                    (l) => l.license_id === Number(e.target.value),
                  );
                  setSelectedLicense(lic);
                }}
              >
                {licenses.map((lic) => (
                  <option key={lic.license_id} value={lic.license_id}>
                    {lic.name} - {getFormattedPrice(lic.price)}
                  </option>
                ))}
              </select>
              {selectedLicense && (
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                  <div className="font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {selectedLicense.name}
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                    {selectedLicense.description}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-400 mb-1">
                    Usage: {selectedLicense.usage_rights}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Price: {getFormattedPrice(selectedLicense.price)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mt-8">
          <label className="block font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Preview
          </label>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-center">
            {audioUrl ? (
              <div className="flex items-center w-full gap-4">
                <button
                  onClick={handlePlayPause}
                  className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                  aria-label={isPlaying ? "Pause preview" : "Play preview"}
                  type="button"
                >
                  {isPlaying ? (
                    <svg
                      className="w-7 h-7"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-7 h-7 ml-1"
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
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="none"
                  className="w-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                ></audio>
              </div>
            ) : (
              <span className="text-gray-600 dark:text-gray-300">
                No preview available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
