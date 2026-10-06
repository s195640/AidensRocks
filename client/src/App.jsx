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
import { AuthProvider, useAuth } from "./admin/context/AuthContext.jsx";
import Admin from "./admin/pages/admin/Admin.jsx";
import Albums from "./admin/pages/albums/Albums.jsx";
import Jobs from "./admin/pages/jobs/Jobs.jsx";
import AccountsAdmin from "./admin/pages/accounts/AccountsAdmin.jsx";
import { LEVELS } from "./admin/utils/accessLevels.js";
import SignIn from "./pages/account/SignIn.jsx";
import SignUp from "./pages/account/SignUp.jsx";
import SignOut from "./pages/account/SignOut.jsx";
import VerifyEmail from "./pages/account/VerifyEmail.jsx";
import ForgotPassword from "./pages/account/ForgotPassword.jsx";
import ResetPassword from "./pages/account/ResetPassword.jsx";
import FollowRocks from "./pages/follow-rocks/FollowRocks.jsx";
import Rocks from "./admin/pages/rocks/Rocks.jsx";
import Users from "./admin/pages/users/Users.jsx";
import Sudc from "./pages/sudc/Sudc.jsx";
import TrackTheRocks from "./pages/track-the-rocks/TrackTheRocks.jsx";
import JourneyAdmin from "./admin/pages/journey/JourneyAdmin.jsx";
import RockRequestsAdmin from "./admin/pages/rock-requests/RockRequestsAdmin.jsx";
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
  { path: "/admin/users", label: "Artists" },
  { path: "/admin/accounts", label: "Accounts" },
  { path: "/admin/rocks", label: "Rocks" },
  { path: "/admin/rock-requests", label: "Rock Requests" },
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
  const { account, isAuthenticated, isUser, isAdmin } = useAuth();

  useEffect(() => {
    axios
      .get("/api/pages")
      .then((res) => {
        setPublicNavItems(
          res.data.map((p) => ({
            slug: p.slug,
            path: PAGE_PATHS[p.slug] || `/${p.slug}`,
            label: p.nav_label,
          }))
        );
      })
      .catch((err) => console.error("Failed to load nav pages:", err));
  }, []);

  // Signed-in-only pages (My Rocks) are hidden from everyone else, and
  // Admin (admins only) is the last menu item. Sign In / "Welcome <name>" +
  // Sign out is not a menu item — the navbar shows it in its own spot at
  // the far right (see Navbar.jsx's account block).
  const visiblePublicNavItems = [
    ...publicNavItems.filter((item) => item.slug !== "follow-rocks" || isUser),
    ...(isAdmin ? [{ path: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className={styles.appContainer}>
      <NavBar
        navItems={isAdminRoute ? adminNavItems : visiblePublicNavItems}
        account={isAuthenticated ? account : null}
      />
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
        <Route path="/login" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/follow-rocks"
          element={
            <PrivateRoute minLevel={LEVELS.USER}>
              <FollowRocks />
            </PrivateRoute>
          }
        />

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
          path="/admin/accounts"
          element={
            <PrivateRoute>
              <AccountsAdmin />
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
          path="/admin/rock-requests"
          element={
            <PrivateRoute>
              <RockRequestsAdmin />
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
