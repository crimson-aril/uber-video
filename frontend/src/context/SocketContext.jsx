import { useEffect } from "react";
import { SocketContext } from "./SocketDataContext.jsx";
import { io } from "socket.io-client";

const socket = io(`${import.meta.env.VITE_BASE_URL}`);

const SocketProvider = ({ children }) => {
  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected to server");
    };

    const handleDisconnect = () => {
      console.log("Disconnected from server");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Cleanup listeners on unmount
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return <SocketContext value={{ socket }}>{children}</SocketContext>;
};

export default SocketProvider;
