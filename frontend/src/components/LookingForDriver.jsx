import { useState } from "react";

const LookingForDriver = ({ retryRide, onCancel, requestMessage }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await retryRide();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section
      className="driver-search-notification-card"
      aria-label="Ride request status"
    >
      <div className="driver-search-notification-copy">
        <span className="driver-search-indicator" aria-hidden="true" />
        <div className="driver-search-notification-text">
          <h3>Looking for a driver</h3>
          <p role="status" aria-live="polite">
            {requestMessage ||
              "Contacting nearby drivers. This may take a moment."}
          </p>
        </div>
      </div>
      <div className="driver-search-actions">
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="driver-search-retry"
        >
          {retrying ? "Retrying…" : "Retry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="driver-search-cancel"
        >
          Cancel
        </button>
      </div>
    </section>
  );
};

export default LookingForDriver;
