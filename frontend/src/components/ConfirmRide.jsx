import { useState } from "react";
import toast from "react-hot-toast";

const ConfirmRide = (props) => {
    const [loading, setLoading] = useState(false);
    const currencySymbol = props.fare?.currency?.symbol || "";

    const handleConfirm = async () => {
        if (!props.pickup || !props.destination || !props.vehicleType) {
            toast.error("Please select pickup, destination, and vehicle type.");
            return;
        }

        try {
            setLoading(true);
            await props.confirmRide();
        } catch (err) {
            console.error("Failed to create ride:", err);
            props.setVehicleFound(false);
            props.setConfirmRidePanel(true);
            toast.error(err?.response?.data?.message || "Failed to request ride. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div>
            <h5
                className="p-1 text-center w-[93%] absolute top-0"
                onClick={() => {
                    if (!loading) props.cancelRideConfirmation();
                }}
            >
                <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
            </h5>
            <h3 className="confirm-ride-title text-2xl font-semibold mb-5">Confirm your Ride</h3>

            <div className="flex gap-2 justify-between flex-col items-center">
                <div className="confirm-ride-details w-full mt-5">
                    <div className="flex items-center gap-5 p-3 border-b-2">
                        <i className="ri-map-pin-user-fill"></i>
                        <div>
                            <h3 className="text-lg font-medium">562/11-A</h3>
                            <p className="text-sm -mt-1 text-gray-600">{props.pickup}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 p-3 border-b-2">
                        <i className="text-lg ri-map-pin-2-fill"></i>
                        <div>
                            <h3 className="text-lg font-medium">562/11-A</h3>
                            <p className="text-sm -mt-1 text-gray-600">{props.destination}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 p-3">
                        <i className="ri-currency-line"></i>
                        <div>
                            <h3 className="text-lg font-medium">
                                {currencySymbol}
                                {props.fare?.[props.vehicleType]}
                            </h3>
                            <p className="text-sm -mt-1 text-gray-600">Cash</p>
                        </div>
                    </div>
                </div>
                <div className="confirm-ride-actions">
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="confirm-ride-primary bg-green-600 disabled:bg-green-400 text-white font-semibold p-2 rounded-lg"
                    >
                        {loading ? "Confirming..." : "Confirm ride"}
                    </button>
                    <button
                        type="button"
                        onClick={props.cancelRideConfirmation}
                        disabled={loading}
                        className="confirm-ride-cancel bg-gray-200 text-gray-800 font-semibold p-2 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmRide;
