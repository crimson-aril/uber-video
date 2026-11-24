import https from "https";
import axios from "axios";
import captainModel from "../models/captain.model.js";

const geoapifyClient = axios.create({
  httpsAgent: new https.Agent({ family: 4 }),
  timeout: 10000,
});

const createMapError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getApiKey = () => {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    throw createMapError("GEOAPIFY_API_KEY is not configured", 503);
  }
  return apiKey;
};

const getGeoapifyData = async (url, message) => {
  try {
    const response = await geoapifyClient.get(url);
    return response.data;
  } catch (error) {
    console.error(
      "Geoapify Error:",
      error.response?.status,
      error.response?.data || error.message,
    );
    throw createMapError(message, 502);
  }
};

export const getAddressCoordinate = async (address) => {
  if (typeof address !== "string" || !address.trim()) {
    throw createMapError("Address is required", 400);
  }

  const apiKey = getApiKey();
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`;
  const data = await getGeoapifyData(url, "Unable to geocode address");
  const location = data?.features?.[0]?.properties;

  if (
    !location ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lon)
  ) {
    throw createMapError("No coordinates found for address", 404);
  }

  return {
    ltd: location.lat,
    lng: location.lon,
    countryCode: location.country_code?.toUpperCase() || null,
  };
};

export const getDistanceTime = async (origin, destination) => {
  if (!origin || !destination) {
    throw createMapError("Origin and destination are required", 400);
  }

  const [originCoords, destCoords] = await Promise.all([
    getAddressCoordinate(origin),
    getAddressCoordinate(destination),
  ]);
  const apiKey = getApiKey();
  const waypoints = `${originCoords.ltd},${originCoords.lng}|${destCoords.ltd},${destCoords.lng}`;
  const url = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${apiKey}`;
  const data = await getGeoapifyData(url, "Unable to calculate route");
  const route = data?.features?.[0]?.properties;

  if (
    !route ||
    !Number.isFinite(route.distance) ||
    !Number.isFinite(route.time)
  ) {
    throw createMapError("No route found between locations", 404);
  }

  return {
    distance: {
      text: `${(route.distance / 1000).toFixed(1)} km`,
      value: route.distance,
    },
    duration: {
      text: `${Math.round(route.time / 60)} mins`,
      value: route.time,
    },
  };
};

export const getAutoCompleteSuggestions = async (input) => {
  if (typeof input !== "string" || !input.trim()) {
    throw createMapError("Query is required", 400);
  }

  const apiKey = getApiKey();
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(input)}&apiKey=${apiKey}`;
  const data = await getGeoapifyData(url, "Unable to fetch suggestions");

  const features = Array.isArray(data?.features) ? data.features : [];
  return features
    .map((feature) => feature?.properties?.formatted)
    .filter(
      (suggestion) => typeof suggestion === "string" && suggestion.length > 0,
    );
};

export const getCaptainsInTheRadius = async (ltd, lng, radius) => {
  // radius in km
  const captains = await captainModel.find({
    "location.ltd": { $exists: true, $ne: null },
    "location.lng": { $exists: true, $ne: null },
  });

  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  return captains.filter((captain) => {
    const capLtd = captain.location.ltd;
    const capLng = captain.location.lng;

    const dLat = toRad(capLtd - ltd);
    const dLon = toRad(capLng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(ltd)) *
        Math.cos(toRad(capLtd)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radius;
  });
};
