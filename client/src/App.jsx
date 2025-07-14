import { Route, Routes } from "react-router-dom";
import "./App.css";
import BTester from "./components/btester/BTester.jsx";
import Footer from "./components/footer/Footer.jsx";
import NavBar from "./components/navbar/Navbar";
import QRRedirect from "./components/qrredirect/QRRedirect.jsx";
import Home from "./pages/Home.jsx";
import Page1 from "./pages/Page1.jsx";
import Page2 from "./pages/Page2.jsx";
import Page3 from "./pages/Page3.jsx";
import ShareYourRock from "./pages/ShareYourRock.jsx";

const navItems = [
  { path: "/", label: "Aiden's Rocks" },
  { path: "/share-your-rock", label: "Share Your Rock" },
  { path: "/page1", label: "Page 1" },
  { path: "/page2", label: "Page 2" },
  { path: "/page3", label: "Page 3" },
];

function App() {
  return (
    <div className="app-container">
      <NavBar navItems={navItems} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/page1" element={<Page1 />} />
        <Route path="/page2" element={<Page2 />} />
        <Route path="/page3" element={<Page3 />} />
        <Route path="/qr" element={<QRRedirect />} />
        <Route path="/share-your-rock" element={<ShareYourRock />} />
      </Routes>
      <Footer />
      {/* <Tracker /> */}
      <BTester />
    </div>
  );
}

export default App;
