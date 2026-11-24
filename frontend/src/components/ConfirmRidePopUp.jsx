import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Avatar from "./Avatar";

const ConfirmRidePopUp = (props) => {
    const [otp, setOtp] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const currencySymbol = props.ride?.currency?.symbol || "";

    const submitHander = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!props.ride?._id) {
            const msg = "Ride data is missing. Please try again.";
            toast.error(msg);
            setErrorMessage(msg);
            return;
        }

        const trimmedOtp = otp.trim();
        if (!trimmedOtp) {
            toast.error("You forgot to enter the OTP!");
            setErrorMessage("You forgot to enter the OTP.");
            return;
        }

        if (trimmedOtp.length !== 6) {
            toast.error("Please enter the full 6-digit OTP.");
            setErrorMessage("Please enter the full 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(
                `${import.meta.env.VITE_BASE_URL}/rides/start-ride`,
                {
                    params: {
                        rideId: props.ride._id,
                        otp: trimmedOtp,
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                },
            );

            if (response.status === 200) {
                toast.success("Ride started!");
                props.setConfirmRidePopupPanel(false);
                props.setRidePopupPanel(false);
                navigate("/captain-riding", { state: { ride: props.ride } });
            }
        } catch (error) {
            const backendMsg =
                error.response?.data?.message ||
                error.response?.data?.errors?.[0]?.msg ||
                "Invalid OTP. Please check and try again.";
            toast.error(backendMsg);
            setErrorMessage(backendMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h5
                className="p-1 text-center w-[93%] absolute top-0"
                onClick={() => {
                    props.setRidePopupPanel(false);
                }}
            >
                <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
            </h5>
            <h3 className="text-2xl font-semibold mb-5">
                Confirm this ride to Start
            </h3>
            <div className="flex items-center justify-between p-3 border-2 border-yellow-400 rounded-lg mt-4">
                <div className="flex items-center gap-3 ">
                    <Avatar
                        seed={
                            props.ride?.user?._id ||
                            `${props.ride?.user?.fullname?.firstname} ${props.ride?.user?.fullname?.lastname}`
                        }
                        size="md"
                    />
                    <h2 className="text-lg font-medium capitalize">
                        {props.ride?.user?.fullname?.firstname}
                    </h2>
                </div>
                <h5 className="text-lg font-semibold">2.2 KM</h5>
            </div>
            <div className="flex gap-2 justify-between flex-col items-center">
                <div className="w-full mt-5">
                    <div className="flex items-center gap-5 p-3 border-b-2">
                        <i className="ri-map-pin-user-fill"></i>
                        <div>
                            <h3 className="text-lg font-medium">562/11-A</h3>
                            <p className="text-sm -mt-1 text-gray-600">
                                {props.ride?.pickup}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 p-3 border-b-2">
                        <i className="text-lg ri-map-pin-2-fill"></i>
                        <div>
                            <h3 className="text-lg font-medium">562/11-A</h3>
                            <p className="text-sm -mt-1 text-gray-600">
                                {props.ride?.destination}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 p-3">
                        <i className="ri-currency-line"></i>
                        <div>
                            <h3 className="text-lg font-medium">
                                {currencySymbol}
                                {props.ride?.fare}
                            </h3>
                            <p className="text-sm -mt-1 text-gray-600">Cash</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 w-full">
                    <form onSubmit={submitHander}>
                        <input
                            value={otp}
                            onChange={(e) => {
                                setOtp(e.target.value);
                                if (errorMessage) setErrorMessage("");
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            className={`bg-[#eee] px-6 py-4 font-mono text-lg rounded-lg w-full mt-3 outline-none border-2 ${errorMessage ? "border-red-500 bg-red-50" : "border-transparent"
                                }`}
                            placeholder="Enter OTP"
                        />

                        {errorMessage && (
                            <p className="text-red-600 text-sm font-medium mt-2 flex items-center gap-1">
                                <i className="ri-error-warning-line"></i>
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-5 text-lg flex justify-center bg-green-600 disabled:bg-green-400 text-white font-semibold p-3 rounded-lg"
                        >
                            {loading ? "Starting..." : "Confirm"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setErrorMessage("");
                                props.setConfirmRidePopupPanel(false);
                                props.setRidePopupPanel(false);
                            }}
                            className="w-full mt-2 bg-red-600 text-lg text-white font-semibold p-3 rounded-lg"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRidePopUp;
