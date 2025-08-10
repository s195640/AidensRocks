import { Route, Routes, useLocation } from "react-router-dom";
import styles from "./App.module.css";
import Footer from "./components/footer/Footer.jsx";
import NavBar from "./components/navbar/Navbar.jsx";
import QRRedirect from "./components/qrredirect/QRRedirect.jsx";
import Home from "./pages/home/Home.jsx";
import Photos from "./pages/photos/Photos.jsx";
import ShareYourRock from "./pages/share-your-rock/ShareYourRock.jsx";

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

const publicNavItems = [
  { path: "/", label: "Home" },
  { path: "/share-your-rock", label: "Share Your Rock" },
  { path: "/photos", label: "Photos" },
  { path: "/track-the-rocks", label: "Track The Rocks" },
  { path: "/sudc", label: "SUDC" },
];

const adminNavItems = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/jobs", label: "Jobs" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/rocks", label: "Rocks" },
  { path: "/admin/albums", label: "Albums" },
  { path: "/admin/journey", label: "Journey" },
  { path: "/", label: "Exit Admin" },
];

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className={styles.appContainer}>
      <NavBar navItems={isAdminRoute ? adminNavItems : publicNavItems} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/qr" element={<QRRedirect />} />
        <Route path="/share-your-rock" element={<ShareYourRock />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/track-the-rocks" element={<TrackTheRocks />} />
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
      </Routes>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
