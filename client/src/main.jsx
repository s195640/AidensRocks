import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import Tracker from "./components/tracker/Tracker.jsx";
import { ARProvider } from "./context/ARContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ARProvider>
      <Tracker />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ARProvider>
  </React.StrictMode>
);
