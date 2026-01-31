import PropTypes from "prop-types";
import BeatCard from "./BeatCard";

export default function BeatGrid({ beats, onPlayBeat, currentlyPlayingId }) {
  if (!beats || beats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          className="w-24 h-24 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No beats found
        </h3>
        <p className="text-gray-500 max-w-md">
          Try adjusting your filters or search query to find more beats.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
      {beats.map((beat) => (
        <BeatCard
          key={beat.id}
          beat={beat}
          onPlay={onPlayBeat}
          isPlaying={currentlyPlayingId === beat.id}
        />
      ))}
    </div>
  );
}

// Prop types validation
BeatGrid.propTypes = {
  beats: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
    }),
  ),
  onPlayBeat: PropTypes.func.isRequired,
  currentlyPlayingId: PropTypes.number,
};

// Default props
BeatGrid.defaultProps = {
  beats: [],
  currentlyPlayingId: null,
};
