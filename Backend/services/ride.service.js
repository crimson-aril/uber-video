import rideModel from "../models/ride.model.js";
import captainModel from "../models/captain.model.js";
import * as mapService from "./maps.service.js";
import crypto from "crypto";
import countryToCurrency from "country-to-currency";

function getCurrencyFromCountry(countryCode) {
  const upper = countryCode?.toUpperCase();
  const map = countryToCurrency.default || countryToCurrency;
  const code = upper && map[upper];
  if (!code) {
    return { code: "", symbol: "" };
  }

  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);

  const symbol = parts.find((p) => p.type === "currency")?.value || code;
  return { code, symbol };
}

export async function getFare(pickup, destination) {
  if (!pickup || !destination) {
    throw new Error("Pickup and destination are required");
  }

  const [pickupCoords, distanceTime] = await Promise.all([
    mapService.getAddressCoordinate(pickup),
    mapService.getDistanceTime(pickup, destination),
  ]);

  const currency = getCurrencyFromCountry(pickupCoords.countryCode);

  const baseFare = {
    auto: 30,
    car: 50,
    moto: 20,
  };

  const perKmRate = {
    auto: 10,
    car: 15,
    moto: 8,
  };

  const perMinuteRate = {
    auto: 2,
    car: 3,
    moto: 1.5,
  };

  const fare = {
    auto: Math.round(
      baseFare.auto +
        (distanceTime.distance.value / 1000) * perKmRate.auto +
        (distanceTime.duration.value / 60) * perMinuteRate.auto,
    ),
    car: Math.round(
      baseFare.car +
        (distanceTime.distance.value / 1000) * perKmRate.car +
        (distanceTime.duration.value / 60) * perMinuteRate.car,
    ),
    moto: Math.round(
      baseFare.moto +
        (distanceTime.distance.value / 1000) * perKmRate.moto +
        (distanceTime.duration.value / 60) * perMinuteRate.moto,
    ),
    currency,
  };

  return fare;
}

function getOtp(num) {
  return crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
}

export const createRide = async ({
  user,
  pickup,
  destination,
  vehicleType,
}) => {
  if (!user || !pickup || !destination || !vehicleType) {
    throw new Error("All fields are required");
  }

  const fare = await getFare(pickup, destination);

  const ride = await rideModel.create({
    user,
    pickup,
    destination,
    otp: getOtp(6),
    fare: fare[vehicleType],
    currency: fare.currency,
  });

  return ride;
};

export const confirmRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  const acceptedRide = await rideModel.findOneAndUpdate(
    { _id: rideId, status: "pending" },
    { $set: { status: "accepted", captain: captain._id } },
    { new: true },
  );

  if (!acceptedRide) {
    const error = new Error("Ride is no longer available");
    error.statusCode = 409;
    throw error;
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
    })
    .populate("user")
    .populate("captain")
    .select("+otp");

  if (!ride) {
    throw new Error("Ride not found");
  }

  return ride;
};

export const cancelRide = async ({ rideId, user }) => {
  if (!rideId || !user?._id) {
    throw new Error("Ride id is required");
  }

  const ride = await rideModel.findOneAndUpdate(
    { _id: rideId, user: user._id, status: "pending" },
    { $set: { status: "cancelled" } },
    { new: true },
  );

  if (!ride) {
    const error = new Error("Ride can no longer be cancelled");
    error.statusCode = 409;
    throw error;
  }

  return ride;
};

export const startRide = async ({ rideId, otp, captain }) => {
  if (!rideId || !otp || !captain?._id) {
    throw new Error("Ride id and OTP are required");
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
    })
    .populate("user")
    .populate("captain")
    .select("+otp");

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.status !== "accepted") {
    const error = new Error("Ride has not been accepted yet");
    error.statusCode = 409;
    throw error;
  }

  if (String(ride.captain?._id) !== String(captain._id)) {
    const error = new Error("This ride is assigned to another captain");
    error.statusCode = 403;
    throw error;
  }

  if (ride.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  const startedRide = await rideModel
    .findOneAndUpdate(
      {
        _id: rideId,
        captain: captain._id,
        status: "accepted",
        otp,
      },
      { $set: { status: "ongoing" } },
      { new: true },
    )
    .populate("user")
    .populate("captain")
    .select("+otp");

  if (!startedRide) {
    const error = new Error("Ride is no longer available to start");
    error.statusCode = 409;
    throw error;
  }

  return startedRide;
};

export const endRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
      captain: captain._id,
    })
    .populate("user")
    .populate("captain")
    .select("+otp");

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.status !== "ongoing") {
    throw new Error("Ride not ongoing");
  }

  await rideModel.findOneAndUpdate(
    {
      _id: rideId,
    },
    {
      status: "completed",
    },
  );

  await captainModel.findByIdAndUpdate(captain._id, {
    $inc: { earnings: ride.fare || 0 },
    ...(ride.currency?.symbol && { currencySymbol: ride.currency.symbol }),
  });

  return ride;
};
