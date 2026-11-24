import { useRef, useState, useEffect, use } from "react";
import { Link } from "react-router-dom";
import CaptainDetails from "../components/CaptainDetails";
import RidePopUp from "../components/RidePopUp";
import ConfirmRidePopUp from "../components/ConfirmRidePopUp";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SocketContext } from "../context/SocketDataContext";
import { CaptainDataContext } from "../context/CaptainDataContext";
import axios from "axios";
import LiveTracking from "../components/LiveTracking";
import toast from "react-hot-toast";
import { RiLogoutBoxRLine } from "@remixicon/react";

const CaptainHome = () => {
  const [ridePopupPanel, setRidePopupPanel] = useState(false);
  const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false);
  const [acceptingRide, setAcceptingRide] = useState(false);
  const [ride, setRide] = useState(null);
  const rideRef = useRef(ride);

  const ridePopupPanelRef = useRef(null);
  const confirmRidePopupPanelRef = useRef(null);

  const { socket } = use(SocketContext);
  const { captain } = use(CaptainDataContext);

  useEffect(() => {
    rideRef.current = ride;
  }, [ride]);

  useEffect(() => {
    if (!captain?._id || !socket) return;

    const handleNewRide = (data) => {
      setRide(data);
      setRidePopupPanel(true);
    };

    const handleRideCancelled = ({ rideId } = {}) => {
      if (String(rideRef.current?._id) !== String(rideId)) return;
      setRidePopupPanel(false);
      setConfirmRidePopupPanel(false);
      setRide(null);
    };

    const joinCaptainSocket = () => {
      socket.emit(
        "join",
        {
          userId: captain._id,
          userType: "captain",
        },
        (result) => {
          if (!result?.ok)
            console.error(
              "Captain socket registration failed:",
              result?.message,
            );
        },
      );
    };

    socket.on("connect", joinCaptainSocket);
    socket.on("new-ride", handleNewRide);
    socket.on("ride-cancelled", handleRideCancelled);
    if (socket.connected) joinCaptainSocket();

    const sendLocation = ({ coords }) => {
      socket.emit(
        "update-location-captain",
        {
          userId: captain._id,
          location: { ltd: coords.latitude, lng: coords.longitude },
        },
        (result) => {
          if (!result?.ok)
            console.error("Captain location update failed:", result?.message);
        },
      );
    };

    let locationWatchId;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (error) =>
          console.error("Initial captain geolocation failed:", error.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      );

      locationWatchId = navigator.geolocation.watchPosition(
        sendLocation,
        (error) =>
          console.error("Captain geolocation unavailable:", error.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    }

    return () => {
      socket.off("connect", joinCaptainSocket);
      socket.off("new-ride", handleNewRide);
      socket.off("ride-cancelled", handleRideCancelled);
      if (locationWatchId !== undefined)
        navigator.geolocation.clearWatch(locationWatchId);
    };
  }, [captain?._id, socket]);

  async function confirmRide() {
    if (!ride?._id || !captain?._id || acceptingRide) return;

    setAcceptingRide(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/rides/confirm`,
        {
          rideId: ride._id,
          captainId: captain._id,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.data?.status !== "accepted") {
        throw new Error("The ride was not marked as accepted. Please try again.");
      }

      toast.success("Ride accepted!");
      setRide(response.data);
      setRidePopupPanel(false);
      setConfirmRidePopupPanel(true);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to confirm ride. Please try again.";
      toast.error(msg);
    } finally {
      setAcceptingRide(false);
    }
  }

  useGSAP(() => {
    gsap.to(ridePopupPanelRef.current, {
      transform: ridePopupPanel ? "translateY(0)" : "translateY(100%)",
      autoAlpha: ridePopupPanel ? 1 : 0,
      pointerEvents: ridePopupPanel ? "auto" : "none",
    });
  }, [ridePopupPanel]);

  useGSAP(() => {
    gsap.to(confirmRidePopupPanelRef.current, {
      transform: confirmRidePopupPanel ? "translateY(0)" : "translateY(100%)",
      autoAlpha: confirmRidePopupPanel ? 1 : 0,
      pointerEvents: confirmRidePopupPanel ? "auto" : "none",
    });
  }, [confirmRidePopupPanel]);

  return (
    <div className="captain-dashboard h-screen overflow-hidden">
      <div className="captain-map-topbar fixed p-6 top-0 left-0 flex items-center justify-between w-full z-20">
        <img
          className="brand-mark"
          style={{ width: "64px", height: "auto" }}
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber Logo"
        />
        <Link
          to="/captain/logout"
          className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow"
          aria-label="Log out"
        >
          <RiLogoutBoxRLine size={20} aria-hidden="true" />
        </Link>
      </div>
      <div className="captain-map-frame h-3/5 w-full">
        <LiveTracking />
      </div>
      <div className="captain-info-panel h-2/5 p-6">
        <CaptainDetails />
      </div>
      <div
        ref={ridePopupPanelRef}
        className="ride-sheet fixed w-full z-30 bottom-0 bg-white px-3 py-10 pt-12"
      >
        {ride && (
          <RidePopUp
            ride={ride}
            setRidePopupPanel={setRidePopupPanel}
            confirmRide={confirmRide}
            acceptingRide={acceptingRide}
          />
        )}
      </div>
      <div
        ref={confirmRidePopupPanelRef}
        className="ride-sheet fixed w-full h-screen z-30 bottom-0 bg-white px-3 py-10 pt-12"
      >
        {ride && (
          <ConfirmRidePopUp
            ride={ride}
            setConfirmRidePopupPanel={setConfirmRidePopupPanel}
            setRidePopupPanel={setRidePopupPanel}
          />
        )}
      </div>
    </div>
  );
};

export default CaptainHome;
