import { Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import Footer from "./components/footer/Footer.jsx";
import NavBar from "./components/navbar/Navbar";
import QRRedirect from "./components/qrredirect/QRRedirect.jsx";
import Home from "./pages/home/Home.jsx";
import Page1 from "./pages/Page1.jsx";
import Page2 from "./pages/Page2.jsx";
import Page3 from "./pages/Page3.jsx";
import ShareYourRock from "./pages/share-your-rock/ShareYourRock.jsx";

import PrivateRoute from "./admin/components/PrivateRoute";
import { AuthProvider } from "./admin/context/AuthContext";
import Admin from "./admin/pages/admin/Admin";
import Jobs from "./admin/pages/jobs/Jobs.jsx";
import Login from "./admin/pages/login/Login";
import Rocks from "./admin/pages/rocks/Rocks.jsx";
import Users from "./admin/pages/users/Users.jsx";
import Sudc from "./pages/sudc/Sudc.jsx";
import TrackTheRocks from "./pages/track-the-rocks/TrackTheRocks.jsx";

const publicNavItems = [
  { path: "/", label: "Home" },
  { path: "/share-your-rock", label: "Share Your Rock" },
  { path: "/track-the-rocks", label: "Track The Rocks" },
  { path: "/sudc", label: "SUDC" },
];

const adminNavItems = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/jobs", label: "Jobs" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/rocks", label: "Rocks" },
  { path: "/", label: "Exit Admin" },
];

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="app-container">
      <NavBar navItems={isAdminRoute ? adminNavItems : publicNavItems} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/page1" element={<Page1 />} />
        <Route path="/page2" element={<Page2 />} />
        <Route path="/page3" element={<Page3 />} />
        <Route path="/qr" element={<QRRedirect />} />
        <Route path="/share-your-rock" element={<ShareYourRock />} />
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
