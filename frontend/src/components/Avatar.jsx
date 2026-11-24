import { useMemo } from "react";
import { Style, Avatar as DiceBearAvatar } from "@dicebear/core";
import avataaarsDef from "@dicebear/styles/avataaars.json" with { type: "json" };

const avataaarsStyle = new Style(avataaarsDef);

const Avatar = ({ seed = "user", size = "md", className = "" }) => {
    const avatarUri = useMemo(() => {
        const avatar = new DiceBearAvatar(avataaarsStyle, {
            seed: seed || "user",
            borderRadius: 50,
            backgroundColor: ["#b6e3f4", "#c0aede", "#d1d4f9", "#ffd5dc", "#ffdfbf"],
        });
        return avatar.toDataUri();
    }, [seed]);

    const sizeClasses = {
        sm: "h-10 w-10",
        md: "h-12 w-12",
        lg: "h-14 w-14",
    };

    return (
        <img
            src={avatarUri}
            alt={seed}
            className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover shrink-0 ${className}`}
        />
    );
};

export default Avatar;
