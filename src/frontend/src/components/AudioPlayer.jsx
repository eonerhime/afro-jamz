import { useEffect, useRef } from "react";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import PropTypes from "prop-types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function CustomAudioPlayer({
  currentBeat,
  onEnded,
  onNext,
  onPrevious,
}) {
  const playerRef = useRef(null);

  useEffect(() => {
    // Auto-play when beat changes
    if (currentBeat && playerRef.current) {
      playerRef.current.audio.current.play();
    }
  }, [currentBeat]);

  if (!currentBeat) {
    return null; // Don't show player if no beat is selected
  }

  // Construct audio URL
  const audioUrl = currentBeat.preview_url
    ? `${API_BASE_URL}${currentBeat.preview_url}`
    : currentBeat.full_url
      ? `${API_BASE_URL}${currentBeat.full_url}`
      : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
        {/* Beat Info */}
        <div className="flex items-center gap-2 sm:gap-4 mb-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded overflow-hidden shrink-0">
            {currentBeat.cover_art_url ? (
              <img
                src={`${API_BASE_URL}${currentBeat.cover_art_url}`}
                alt={currentBeat.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
              {currentBeat.title}
            </h4>
            <p className="text-xs text-gray-600 truncate">
              {currentBeat.producer_name || "Unknown Producer"}
            </p>
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayer
          ref={playerRef}
          src={audioUrl}
          onEnded={onEnded}
          showSkipControls={true}
          onClickPrevious={onPrevious}
          onClickNext={onNext}
          autoPlayAfterSrcChange={true}
          customAdditionalControls={[]}
          customVolumeControls={[]}
          layout="horizontal-reverse"
          className="shadow-none"
        />
      </div>
    </div>
  );
}

CustomAudioPlayer.propTypes = {
  currentBeat: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    producer_name: PropTypes.string,
    cover_art_url: PropTypes.string,
    preview_url: PropTypes.string,
    audio_file_path: PropTypes.string,
  }),
  onEnded: PropTypes.func,
  onNext: PropTypes.func,
  onPrevious: PropTypes.func,
};

CustomAudioPlayer.defaultProps = {
  currentBeat: null,
  onEnded: () => {},
  onNext: () => {},
  onPrevious: () => {},
};
