import * as rideService from "../services/ride.service.js";
import { validationResult } from "express-validator";
import * as mapService from "../services/maps.service.js";
import { sendMessageToRoom } from "../socket.js";
import rideModel from "../models/ride.model.js";

const getErrorStatus = (error) => error.statusCode || 500;

export const createRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination, vehicleType } = req.body;

  try {
    const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
    const captainsInRadius = await mapService.getCaptainsInTheRadius(
      pickupCoordinates.ltd,
      pickupCoordinates.lng,
      5,
    );
    console.log(
      "Pickup coords:",
      pickupCoordinates,
      "Captains found:",
      captainsInRadius.length,
    );
    const ride = await rideService.createRide({
      user: req.user._id,
      pickup,
      destination,
      vehicleType,
    });

    const rideWithUser = await rideModel
      .findOne({ _id: ride._id })
      .populate("user");
    ride.otp = "";

    const notifiedCaptains = captainsInRadius.reduce((count, captain) => {
      const sent = sendMessageToRoom(`captain:${captain._id}`, {
        event: "new-ride",
        data: rideWithUser,
      });
      return count + (sent ? 1 : 0);
    }, 0);

    console.log(
      `Ride ${ride._id}: notified ${notifiedCaptains} connected captain(s) within 2 km`,
    );

    return res.status(201).json({ ...ride.toObject(), notifiedCaptains });
  } catch (err) {
    console.error("CREATE RIDE ERROR:", err);
    return res
      .status(getErrorStatus(err))
      .json({ message: err.message || "Unable to create ride" });
  }
};

export const getFare = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination } = req.query;

  try {
    const fare = await rideService.getFare(pickup, destination);
    return res.status(200).json(fare);
  } catch (err) {
    return res
      .status(getErrorStatus(err))
      .json({
        message: err.statusCode ? err.message : "Unable to calculate fare",
      });
  }
};

export const cancelRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const ride = await rideService.cancelRide({
      rideId: req.body.rideId,
      user: req.user,
    });

    sendMessageToRoom("captains", {
      event: "ride-cancelled",
      data: { rideId: ride._id.toString() },
    });

    return res.status(200).json({ rideId: ride._id.toString() });
  } catch (err) {
    return res
      .status(getErrorStatus(err))
      .json({ message: err.message || "Unable to cancel ride" });
  }
};

export const confirmRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  try {
    const ride = await rideService.confirmRide({
      rideId,
      captain: req.captain,
    });

    sendMessageToRoom(`user:${ride.user._id}`, {
      event: "ride-confirmed",
      data: ride,
    });

    return res.status(200).json(ride);
  } catch (err) {
    console.log(err);
    return res.status(getErrorStatus(err)).json({ message: err.message });
  }
};

export const startRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId, otp } = req.query;

  try {
    const ride = await rideService.startRide({
      rideId,
      otp,
      captain: req.captain,
    });

    console.log(ride);

    sendMessageToRoom(`user:${ride.user._id}`, {
      event: "ride-started",
      data: ride,
    });

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(getErrorStatus(err)).json({ message: err.message });
  }
};

export const endRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  try {
    const ride = await rideService.endRide({ rideId, captain: req.captain });

    sendMessageToRoom(`user:${ride.user._id}`, {
      event: "ride-ended",
      data: ride,
    });

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
