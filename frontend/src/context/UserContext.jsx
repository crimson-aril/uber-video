import { useState } from "react";
import { UserDataContext } from "./UserDataContext.jsx";

const UserContext = ({ children }) => {
  const [user, setUser] = useState({
    email: "",
    fullName: {
      firstName: "",
      lastName: "",
    },
  });

  return (
    <UserDataContext value={{ user, setUser }}>{children}</UserDataContext>
  );
};

export default UserContext;
