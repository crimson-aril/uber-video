import { useState, use } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CaptainDataContext } from "../context/CaptainDataContext";
import Avatar from "./Avatar";

const FinishRide = (props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { setCaptain } = use(CaptainDataContext);
    const currencySymbol = props.ride?.currency?.symbol || "";

    async function endRide() {
        if (!props.ride?._id) {
            toast.error("Ride details are missing. Please try again.");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/rides/end-ride`,
                {
                    rideId: props.ride._id,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                },
            );

            if (response.status === 200) {
                setCaptain((prev) => ({
                    ...prev,
                    earnings: (prev?.earnings || 0) + (props.ride?.fare || 0),
                    ...(currencySymbol && { currencySymbol }),
                }));
                const fare = response.data?.fare ?? props.ride?.fare;
                const symbol = response.data?.currency?.symbol || currencySymbol;
                toast(
                    `Ride completed. Fare ${symbol}${fare} is unpaid. Please collect it from the customer.`,
                    { icon: "⚠️", duration: 8500 },
                );
                navigate("/captain-home");
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.response?.data?.errors?.[0]?.msg ||
                "Failed to finish ride. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h5
                className="p-1 text-center w-[93%] absolute top-0"
                onClick={() => {
                    props.setFinishRidePanel(false);
                }}
            >
                <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
            </h5>
            <h3 className="text-2xl font-semibold mb-5">Finish this Ride</h3>
            <div className="flex items-center justify-between p-4 border-2 border-yellow-400 rounded-lg mt-4">
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

                <div className="mt-10 w-full">
                    <button
                        onClick={endRide}
                        disabled={loading}
                        className="w-full mt-5 flex text-lg justify-center bg-green-600 disabled:bg-green-400 text-white font-semibold p-3 rounded-lg"
                    >
                        {loading ? "Finishing..." : "Finish Ride"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinishRide;
