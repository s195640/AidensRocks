import { createContext, useContext, useState } from "react";

const ARContext = createContext(null);

export const ARProvider = ({ children }) => {
  const [rValue, setRValue] = useState(() => {
    return sessionStorage.getItem("rock_num_qr") || null;
  });

  const [trackerData, setTrackerData] = useState(null);

  return (
    <ARContext.Provider
      value={{ rValue, setRValue, trackerData, setTrackerData }}
    >
      {children}
    </ARContext.Provider>
  );
};

export const useARContext = () => {
  const context = useContext(ARContext);
  if (!context) {
    throw new Error("useARContext must be used within an ARProvider");
  }
  return context;
};
