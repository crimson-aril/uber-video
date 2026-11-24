import { use } from "react";
import {
    RiCarLine,
    RiCheckboxCircleLine,
    RiGroupLine,
} from "@remixicon/react";
import { CaptainDataContext } from "../context/CaptainDataContext";
import Avatar from "./Avatar";

const CaptainDetails = () => {
    const { captain } = use(CaptainDataContext);
    const currencySymbol = captain?.currencySymbol || "";
    const vehicleType = captain?.vehicle?.vehicleType || "—";
    const formattedVehicleType =
        vehicleType === "—"
            ? vehicleType
            : vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);
    const capacity = Number(captain?.vehicle?.capacity);
    const capacityLabel = Number.isFinite(capacity) && capacity > 0
        ? `${capacity} seat${capacity === 1 ? "" : "s"}`
        : "—";
    const status = captain?.status || "unknown";
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const fullName = `${captain?.fullname?.firstname || ""} ${captain?.fullname?.lastname || ""}`.trim();

    return (
        <section className="captain-profile-card" aria-label="Captain summary">
            <header className="captain-profile-header">
                <div className="captain-profile-identity">
                    <Avatar
                        seed={captain?._id || fullName || "captain"}
                        size="md"
                    />
                    <div className="captain-profile-name-wrap">
                        <p className="captain-profile-eyebrow">Captain</p>
                        <h3 className="captain-profile-name">
                            {fullName || "Your profile"}
                        </h3>
                    </div>
                </div>
                <div className="captain-profile-earnings">
                    <span>Earned</span>
                    <strong>
                        {currencySymbol}
                        {(captain?.earnings || 0).toFixed(2)}
                    </strong>
                </div>
            </header>

            <div className="captain-stats">
                <div className="captain-stat">
                    <div className="captain-stat-label">
                        <RiCarLine size={17} aria-hidden="true" />
                        <span>Vehicle</span>
                    </div>
                    <strong className="captain-stat-value">
                        {formattedVehicleType}
                    </strong>
                </div>
                <div className="captain-stat">
                    <div className="captain-stat-label">
                        <RiGroupLine size={17} aria-hidden="true" />
                        <span>Capacity</span>
                    </div>
                    <strong className="captain-stat-value">
                        {capacityLabel}
                    </strong>
                </div>
                <div className="captain-stat">
                    <div className="captain-stat-label">
                        <RiCheckboxCircleLine size={17} aria-hidden="true" />
                        <span>Status</span>
                    </div>
                    <strong
                        className={`captain-stat-value captain-status captain-status-${status}`}
                    >
                        {formattedStatus}
                    </strong>
                </div>
            </div>
        </section>
    );
};

export default CaptainDetails;
