import { useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons in Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const containerStyle = {
  width: "100%",
  height: "100%",
};

const LeafletFallbackMap = ({ currentPosition }) => (
  <MapContainer
    center={[currentPosition.lat, currentPosition.lng]}
    zoom={15}
    style={containerStyle}
    zoomControl={false}
  >
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap contributors"
    />
    <Marker position={[currentPosition.lat, currentPosition.lng]} />
  </MapContainer>
);

const LiveTracking = () => {
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [currentPosition, setCurrentPosition] = useState(null);
  // 1. Initialize browser support error directly in useState
  const [locationError, setLocationError] = useState(() =>
    !navigator.geolocation
      ? "Geolocation is not supported by your browser."
      : null,
  );
  const [useFallback, setUseFallback] = useState(!googleApiKey);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 2. Exit early without calling setState synchronously
    if (!navigator.geolocation) return;

    const handleSuccess = (position) => {
      setCurrentPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setLocationError(null);
    };

    const handleError = (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setLocationError(
          "Location access was blocked. Please allow location permissions in your browser settings and try again.",
        );
      } else {
        setLocationError(
          "Unable to retrieve your location. Please check your GPS signal and try again.",
        );
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [retryCount]);

  // Catch Google Maps auth/billing failures (gm_authFailure) and switch to Leaflet
  useEffect(() => {
    if (!googleApiKey) return;

    const handleAuthFailure = () => {
      console.warn(
        "Google Maps failed to authenticate—switching to Leaflet fallback.",
      );
      setUseFallback(true);
    };

    window.gm_authFailure = handleAuthFailure;
    return () => {
      if (window.gm_authFailure === handleAuthFailure) {
        delete window.gm_authFailure;
      }
    };
  }, [googleApiKey]);

  // 3. Reset error state inside the event handler when retrying
  const handleRetry = () => {
    setLocationError(null);
    setRetryCount((prev) => prev + 1);
  };

  if (locationError) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "20px",
          textAlign: "center",
          gap: "12px",
        }}
      >
        <p style={{ margin: 0, color: "#d32f2f" }}>{locationError}</p>
        <button
          onClick={handleRetry}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#fff",
            backgroundColor: "#1976d2",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Retry Location Access
        </button>
      </div>
    );
  }

  if (!currentPosition) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "20px",
          gap: "12px",
        }}
      >
        <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #e0e0e0",
            borderTop: "3px solid #1976d2",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ color: "#555", fontSize: "14px" }}>
          Locating your position...
        </span>
      </div>
    );
  }

  if (useFallback) {
    return <LeafletFallbackMap currentPosition={currentPosition} />;
  }

  return (
    <APIProvider apiKey={googleApiKey} onError={() => setUseFallback(true)}>
      <Map
        style={containerStyle}
        defaultCenter={currentPosition}
        defaultZoom={15}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI={true}
      >
        <AdvancedMarker position={currentPosition} />
      </Map>
    </APIProvider>
  );
};

export default LiveTracking;
