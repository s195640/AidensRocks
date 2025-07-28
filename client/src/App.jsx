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

const publicNavItems = [
  { path: "/", label: "Home" },
  { path: "/share-your-rock", label: "Share Your Rock" },
  { path: "/page1", label: "Page 1" },
  { path: "/page2", label: "Page 2" },
  { path: "/page3", label: "Page 3" },
];

const adminNavItems = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/jobs", label: "Jobs" },
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
