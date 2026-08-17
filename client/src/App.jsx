import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import axios from "axios";
import styles from "./App.module.css";
import Footer from "./components/footer/Footer.jsx";
import NavBar from "./components/navbar/Navbar.jsx";
import QRRedirect from "./components/qrredirect/QRRedirect.jsx";
import NotFoundRedirect from "./components/notfoundredirect/NotFoundRedirect.jsx";
import Home from "./pages/home/Home.jsx";
import Photos from "./pages/photos/Photos.jsx";
import Birthdays from "./pages/birthdays/Birthdays.jsx";
import HonoringAiden from "./pages/honoring-aiden/HonoringAiden.jsx";
import ShareYourRock from "./pages/share-your-rock/ShareYourRock.jsx";
import Map from "./pages/map/Map.jsx";

import PrivateRoute from "./admin/components/PrivateRoute.jsx";
import { AuthProvider } from "./admin/context/AuthContext.jsx";
import Admin from "./admin/pages/admin/Admin.jsx";
import Albums from "./admin/pages/albums/Albums.jsx";
import Jobs from "./admin/pages/jobs/Jobs.jsx";
import Login from "./admin/pages/login/Login.jsx";
import Rocks from "./admin/pages/rocks/Rocks.jsx";
import Users from "./admin/pages/users/Users.jsx";
import Sudc from "./pages/sudc/Sudc.jsx";
import TrackTheRocks from "./pages/track-the-rocks/TrackTheRocks.jsx";
import JourneyAdmin from "./admin/pages/journey/JourneyAdmin.jsx";
import AllRocks from "./pages/all-rocks/AllRocks.jsx";
import MusicAdmin from "./admin/pages/music/MusicAdmin.jsx";
import HonoringAidenAdmin from "./admin/pages/honoring-aiden/HonoringAidenAdmin.jsx";
import PagesAdmin from "./admin/pages/pages/PagesAdmin.jsx";
import EmailPreview from "./admin/pages/pages/email-preview/EmailPreview.jsx";
import PAGE_PATHS from "./adminContent/pagePaths.js";
import { PreviewProvider } from "./adminContent/PreviewContext.jsx";
import { UnsavedChangesProvider } from "./context/UnsavedChangesContext.jsx";

const adminNavItems = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/jobs", label: "Jobs" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/rocks", label: "Rocks" },
  { path: "/admin/albums", label: "Albums" },
  { path: "/admin/journey", label: "Journey" },
  { path: "/admin/music", label: "Music" },
  { path: "/admin/pages", label: "Page Details" },
  { path: "/admin/honoring-aiden", label: "Honoring Aiden" },
  { path: "/", label: "Exit Admin" },
];

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const [publicNavItems, setPublicNavItems] = useState([]);

  useEffect(() => {
    axios
      .get("/api/pages")
      .then((res) => {
        setPublicNavItems(
          res.data.map((p) => ({
            path: PAGE_PATHS[p.slug] || `/${p.slug}`,
            label: p.nav_label,
          }))
        );
      })
      .catch((err) => console.error("Failed to load nav pages:", err));
  }, []);

  return (
    <div className={styles.appContainer}>
      <NavBar navItems={isAdminRoute ? adminNavItems : publicNavItems} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/qr" element={<QRRedirect />} />
        <Route path="/share-your-rock" element={<ShareYourRock />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/birthdays" element={<Birthdays />} />
        <Route path="/honoring-aiden/*" element={<HonoringAiden />} />
        <Route path="/track-the-rocks" element={<TrackTheRocks />} />
        <Route path="/all-rocks" element={<AllRocks />} />
        <Route path="/map" element={<Map />} />
        <Route path="/sudc" element={<Sudc />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/jobs"
          element={
            <PrivateRoute>
              <Jobs />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute>
              <Users />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/rocks"
          element={
            <PrivateRoute>
              <Rocks />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/albums"
          element={
            <PrivateRoute>
              <Albums />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/journey"
          element={
            <PrivateRoute>
              <JourneyAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/music"
          element={
            <PrivateRoute>
              <MusicAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/pages"
          element={
            <PrivateRoute>
              <PagesAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/honoring-aiden/*"
          element={
            <PrivateRoute>
              <HonoringAidenAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/preview-email/:slug"
          element={
            <PrivateRoute>
              <EmailPreview />
            </PrivateRoute>
          }
        />

        {/* Catch-all: any unmatched path logs a hit and redirects home */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PreviewProvider>
        <UnsavedChangesProvider>
          <AppContent />
        </UnsavedChangesProvider>
      </PreviewProvider>
    </AuthProvider>
  );
}

export default App;
