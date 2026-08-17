import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import Tracker from "./components/tracker/Tracker.jsx";
import { ARProvider } from "./context/ARContext.jsx";
import "./index.css";
// @s195640/content-editor's own stylesheet (ContentEditor/ContentViewer) —
// loaded once, globally, since both the admin and public usages
// (pages/honoring-aiden/EntryDetailView.jsx, in either mode) live in this
// same SPA. See data/ai-build-docs/honoring-aiden/summary-issue-log.md.
import "@s195640/content-editor/styles.css";

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
