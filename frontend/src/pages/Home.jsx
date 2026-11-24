import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import axios from "axios";
import LocationSearchPanel from "../components/LocationSearchPanel";
import VehiclePanel from "../components/VehiclePanel";
import ConfirmRide from "../components/ConfirmRide";
import LookingForDriver from "../components/LookingForDriver";
import WaitingForDriver from "../components/WaitingForDriver";
import { SocketContext } from "../context/SocketDataContext";
import { use } from "react";
import { UserDataContext } from "../context/UserDataContext";
import { useNavigate } from "react-router-dom";
import LiveTracking from "../components/LiveTracking";
import { RiArrowDownWideLine } from "@remixicon/react";
import toast from "react-hot-toast";

const Home = () => {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const vehiclePanelRef = useRef(null);
  const confirmRidePanelRef = useRef(null);
  const vehicleFoundRef = useRef(null);
  const waitingForDriverRef = useRef(null);
  const ridePanelFlowRef = useRef(0);
  const panelRef = useRef(null);
  const panelCloseRef = useRef(null);
  const pickupSuggestionsTimerRef = useRef(null);
  const destinationSuggestionsTimerRef = useRef(null);
  const pickupSuggestionsRequestRef = useRef(null);
  const destinationSuggestionsRequestRef = useRef(null);
  const [vehiclePanel, setVehiclePanel] = useState(false);
  const [confirmRidePanel, setConfirmRidePanel] = useState(false);
  const [vehicleFound, setVehicleFound] = useState(false);
  const [waitingForDriver, setWaitingForDriver] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [fare, setFare] = useState({});
  const [vehicleType, setVehicleType] = useState(null);
  const [ride, setRide] = useState(null);
  const [pendingRideId, setPendingRideId] = useState(null);
  const [rideRequestMessage, setRideRequestMessage] = useState("");

  const navigate = useNavigate();

  const { socket } = use(SocketContext);
  const { user } = use(UserDataContext);

  const hideRidePanels = useCallback(() => {
    [
      vehiclePanelRef,
      confirmRidePanelRef,
      vehicleFoundRef,
      waitingForDriverRef,
    ].forEach((panelRef) => {
      if (panelRef.current) {
        gsap.killTweensOf(panelRef.current);
        if (panelRef === vehicleFoundRef) {
          gsap.set(panelRef.current, { y: -12, autoAlpha: 0 });
        } else {
          gsap.set(panelRef.current, {
            transform: "translateY(100%)",
            autoAlpha: 0,
            pointerEvents: "none",
          });
        }
      }
    });
    setVehiclePanel(false);
    setConfirmRidePanel(false);
    setVehicleFound(false);
    setWaitingForDriver(false);
  }, []);

  useEffect(() => {
    if (!user?._id || !socket) return;

    const joinUserSocket = () => {
      socket.emit("join", { userType: "user", userId: user._id }, (result) => {
        if (!result?.ok)
          console.error("User socket registration failed:", result?.message);
      });
    };

    const handleRideConfirmed = (ride) => {
      ridePanelFlowRef.current += 1;
      hideRidePanels();
      setRide(ride);
      setPendingRideId(null);
      setWaitingForDriver(true);
    };

    const handleRideStarted = (ride) => {
      ridePanelFlowRef.current += 1;
      hideRidePanels();
      setPendingRideId(null);
      navigate("/riding", { state: { ride } });
    };

    socket.on("connect", joinUserSocket);
    socket.on("ride-confirmed", handleRideConfirmed);
    socket.on("ride-started", handleRideStarted);
    if (socket.connected) joinUserSocket();

    return () => {
      socket.off("connect", joinUserSocket);
      socket.off("ride-confirmed", handleRideConfirmed);
      socket.off("ride-started", handleRideStarted);
    };
  }, [user, socket, navigate, hideRidePanels]);

  const requestSuggestions = (
    value,
    setSuggestions,
    timerRef,
    requestRef,
    fieldName,
  ) => {
    clearTimeout(timerRef.current);
    requestRef.current?.abort();
    setSuggestions([]);

    if (value.trim().length < 3) return;

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      requestRef.current = controller;

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`,
          {
            params: { input: value },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          },
        );
        setSuggestions(response.data);
      } catch (error) {
        if (error.code !== "ERR_CANCELED") {
          console.error(`${fieldName} suggestions error:`, error);
        }
      }
    }, 400);
  };

  const handlePickupChange = (e) => {
    const value = e.target.value;
    setPickup(value);
    requestSuggestions(
      value,
      setPickupSuggestions,
      pickupSuggestionsTimerRef,
      pickupSuggestionsRequestRef,
      "Pickup",
    );
  };

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    requestSuggestions(
      value,
      setDestinationSuggestions,
      destinationSuggestionsTimerRef,
      destinationSuggestionsRequestRef,
      "Destination",
    );
  };

  const openLocationSearch = (field) => {
    ridePanelFlowRef.current += 1;
    const previousRideId = pendingRideId;
    setPendingRideId(null);
    if (previousRideId) {
      cancelPendingRide(previousRideId).catch((error) =>
        toast.error(error.response?.data?.message || "Unable to cancel ride."),
      );
    }
    hideRidePanels();
    setPanelOpen(true);
    setActiveField(field);
  };

  const cancelRideConfirmation = () => {
    ridePanelFlowRef.current += 1;
    hideRidePanels();
    setVehiclePanel(true);
  };

  const selectVehicle = (type) => {
    ridePanelFlowRef.current += 1;
    hideRidePanels();
    setVehicleType(type);
    setConfirmRidePanel(true);
  };

  const cancelDriverSearch = async () => {
    ridePanelFlowRef.current += 1;
    const rideId = pendingRideId;
    setPendingRideId(null);
    hideRidePanels();
    setRideRequestMessage("");
    if (!rideId) return;

    try {
      await cancelPendingRide(rideId);
      toast.success("Ride request cancelled.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to cancel ride.");
    }
  };

  useEffect(
    () => () => {
      clearTimeout(pickupSuggestionsTimerRef.current);
      clearTimeout(destinationSuggestionsTimerRef.current);
      pickupSuggestionsRequestRef.current?.abort();
      destinationSuggestionsRequestRef.current?.abort();
    },
    [],
  );

  const submitHandler = (e) => {
    e.preventDefault();
  };

  useGSAP(
    function () {
      if (panelOpen) {
        gsap.to(panelRef.current, {
          height: "70%",
          padding: 24,
          // opacity:1
        });
        gsap.to(panelCloseRef.current, {
          opacity: 1,
        });
      } else {
        gsap.to(panelRef.current, {
          height: "0%",
          padding: 0,
          // opacity:0
        });
        gsap.to(panelCloseRef.current, {
          opacity: 0,
        });
      }
    },
    [panelOpen],
  );

  useGSAP(
    function () {
      if (vehiclePanel) {
        gsap.to(vehiclePanelRef.current, {
          transform: "translateY(0)",
          autoAlpha: 1,
          pointerEvents: "auto",
        });
      } else {
        gsap.to(vehiclePanelRef.current, {
          transform: "translateY(100%)",
          autoAlpha: 0,
          pointerEvents: "none",
        });
      }
    },
    [vehiclePanel],
  );

  useGSAP(
    function () {
      if (confirmRidePanel) {
        gsap.to(confirmRidePanelRef.current, {
          transform: "translateY(0)",
          autoAlpha: 1,
          pointerEvents: "auto",
        });
      } else {
        gsap.to(confirmRidePanelRef.current, {
          transform: "translateY(100%)",
          autoAlpha: 0,
          pointerEvents: "none",
        });
      }
    },
    [confirmRidePanel],
  );

  useGSAP(
    function () {
      gsap.to(vehicleFoundRef.current, {
        y: vehicleFound ? 0 : -12,
        autoAlpha: vehicleFound ? 1 : 0,
        duration: vehicleFound ? 0.35 : 0.2,
        ease: vehicleFound ? "power2.out" : "power1.in",
      });
    },
    [vehicleFound],
  );

  useGSAP(
    function () {
      if (waitingForDriver) {
        gsap.to(waitingForDriverRef.current, {
          transform: "translateY(0)",
          autoAlpha: 1,
          pointerEvents: "auto",
        });
      } else {
        gsap.to(waitingForDriverRef.current, {
          transform: "translateY(100%)",
          autoAlpha: 0,
          pointerEvents: "none",
        });
      }
    },
    [waitingForDriver],
  );

  async function findTrip() {
    const flow = ++ridePanelFlowRef.current;
    const previousRideId = pendingRideId;
    setPendingRideId(null);
    if (previousRideId) {
      try {
        await cancelPendingRide(previousRideId);
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to cancel ride.");
        return;
      }
    }
    hideRidePanels();
    setRideRequestMessage("");
    setPanelOpen(false);

    const fareRequest = axios.get(
      `${import.meta.env.VITE_BASE_URL}/rides/get-fare`,
      {
        params: { pickup, destination },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    const response = await fareRequest;

    if (ridePanelFlowRef.current !== flow) return;
    setFare(response.data);
    setVehiclePanel(true);
  }

  async function confirmRideRequest() {
    const flow = ridePanelFlowRef.current;
    await createRide();
    if (ridePanelFlowRef.current !== flow) return;

    hideRidePanels();
    setVehicleFound(true);
  }

  async function cancelPendingRide(rideId) {
    await axios.post(
      `${import.meta.env.VITE_BASE_URL}/rides/cancel`,
      { rideId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );
  }

  async function retryRide() {
    const flow = ridePanelFlowRef.current;
    if (pendingRideId) {
      try {
        await cancelPendingRide(pendingRideId);
        setPendingRideId(null);
      } catch (error) {
        setRideRequestMessage(
          error.response?.data?.message || "Unable to retry this ride.",
        );
        return;
      }
    }
    if (ridePanelFlowRef.current === flow) await createRide();
  }

  async function createRide() {
    const flow = ridePanelFlowRef.current;
    setRideRequestMessage("");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/rides/create`,
        {
          pickup,
          destination,
          vehicleType,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (ridePanelFlowRef.current !== flow) {
        await cancelPendingRide(response.data._id);
        return;
      }
      setPendingRideId(response.data._id);
      if (response.data.notifiedCaptains === 0) {
        setRideRequestMessage(
          "No connected captain within 2 km was notified. Keep captain location enabled and try again.",
        );
      } else {
        const count = response.data.notifiedCaptains;
        setRideRequestMessage(
          `Request sent to ${count} nearby captain${count === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      console.error(
        "Create ride failed:",
        error.response?.data || error.message,
      );
      setRideRequestMessage(
        error.response?.data?.message ||
          "Could not send the ride request. Please try again.",
      );
    }
  }

  return (
    <div className="home-page h-screen relative overflow-hidden">
      {!panelOpen && (
        <img
          className="brand-mark w-16 absolute left-5 top-5"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber"
        />
      )}
      <div className="home-map h-screen w-screen">
        {/* image for temporary use  */}
        <LiveTracking />
      </div>
      <div className="trip-finder-overlay flex flex-col justify-end h-screen absolute top-0 w-full">
        <div className="trip-booking-panel h-[30%] p-6 bg-white relative">
          <h5
            ref={panelCloseRef}
            onClick={() => {
              setPanelOpen(false);
            }}
            className="absolute opacity-0 right-6 top-6 text-2xl"
          >
            <RiArrowDownWideLine />
          </h5>
          <h4 className="text-2xl font-semibold">Find a trip</h4>
          <form
            className="relative py-3"
            onSubmit={(e) => {
              submitHandler(e);
            }}
          >
            <div className="line absolute h-16 w-1 top-[50%] -translate-y-1/2 left-5 bg-gray-700 rounded-full"></div>
            <input
              onClick={() => {
                openLocationSearch("pickup");
              }}
              value={pickup}
              onChange={handlePickupChange}
              className="bg-[#eee] px-12 py-2 text-lg rounded-lg w-full"
              type="text"
              placeholder="Add a pick-up location"
            />
            <input
              onClick={() => {
                openLocationSearch("destination");
              }}
              value={destination}
              onChange={handleDestinationChange}
              className="bg-[#eee] px-12 py-2 text-lg rounded-lg w-full  mt-3"
              type="text"
              placeholder="Enter your destination"
            />
          </form>
          <button
            onClick={findTrip}
            className="bg-black text-white px-4 py-2 rounded-lg mt-3 w-full"
          >
            Find Trip
          </button>
        </div>
        <div ref={panelRef} className="trip-search-drawer bg-white h-0">
          <LocationSearchPanel
            suggestions={
              activeField === "pickup"
                ? pickupSuggestions
                : destinationSuggestions
            }
            setPanelOpen={setPanelOpen}
            setVehiclePanel={setVehiclePanel}
            setPickup={setPickup}
            setDestination={setDestination}
            activeField={activeField}
          />
        </div>
      </div>
      <div
        ref={vehiclePanelRef}
        className="ride-sheet fixed w-full z-10 bottom-0 bg-white px-3 py-10 pt-12"
      >
        <VehiclePanel
          onSelectVehicle={selectVehicle}
          fare={fare}
          setVehiclePanel={setVehiclePanel}
        />
      </div>
      <div
        ref={confirmRidePanelRef}
        className="ride-sheet confirm-ride-sheet fixed w-full z-10 bottom-0 bg-white px-3 py-6 pt-12"
      >
        <ConfirmRide
          confirmRide={confirmRideRequest}
          pickup={pickup}
          destination={destination}
          fare={fare}
          vehicleType={vehicleType}
          setConfirmRidePanel={setConfirmRidePanel}
          setVehicleFound={setVehicleFound}
          cancelRideConfirmation={cancelRideConfirmation}
        />
      </div>
      <div
        ref={vehicleFoundRef}
        className="driver-search-notification"
      >
        <LookingForDriver
          retryRide={retryRide}
          onCancel={cancelDriverSearch}
          requestMessage={rideRequestMessage}
        />
      </div>
      <div
        ref={waitingForDriverRef}
        className="ride-sheet fixed w-full z-10 bottom-0 bg-white px-3 py-6 pt-12"
      >
        <WaitingForDriver
          ride={ride}
          setVehicleFound={setVehicleFound}
          setWaitingForDriver={setWaitingForDriver}
          waitingForDriver={waitingForDriver}
        />
      </div>
    </div>
  );
};

export default Home;
