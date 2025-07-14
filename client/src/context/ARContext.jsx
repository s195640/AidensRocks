import { createContext, useContext, useState } from "react";

const ARContext = createContext();

export const ARProvider = ({ children }) => {
  const [rValue, setRValue] = useState(null);

  return (
    <ARContext.Provider value={{ rValue, setRValue }}>
      {children}
    </ARContext.Provider>
  );
};

export const useARContext = () => useContext(ARContext);
