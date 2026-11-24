import * as mapService from "../services/maps.service.js";
import { validationResult } from "express-validator";

const sendMapError = (res, error) => {
  console.error("Map Error Details:", error.response?.data || error);
  const statusCode = error.statusCode || 500;
  const message =
    statusCode >= 500 ? "Map provider request failed" : error.message;
  return res.status(statusCode).json({ message });
};

export const getCoordinates = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const coordinates = await mapService.getAddressCoordinate(
      req.query.address,
    );
    return res.status(200).json(coordinates);
  } catch (error) {
    return sendMapError(res, error);
  }
};

export const getDistanceTime = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { origin, destination } = req.query;
    const distanceTime = await mapService.getDistanceTime(origin, destination);
    return res.status(200).json(distanceTime);
  } catch (error) {
    return sendMapError(res, error);
  }
};

export const getAutoCompleteSuggestions = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const suggestions = await mapService.getAutoCompleteSuggestions(
      req.query.input,
    );
    return res.status(200).json(suggestions);
  } catch (error) {
    return sendMapError(res, error);
  }
};
