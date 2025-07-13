import { Route, Routes } from "react-router-dom";
import "./App.css";
import BTester from "./components/btester/BTester.jsx";
import Footer from "./components/footer/Footer.jsx";
import NavBar from "./components/navbar/Navbar";
import Home from "./pages/Home.jsx";
import Page1 from "./pages/Page1.jsx";
import Page2 from "./pages/Page2.jsx";
import Page3 from "./pages/Page3.jsx";

function App() {
  return (
    <div className="app-container">
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/page1" element={<Page1 />} />
        <Route path="/page2" element={<Page2 />} />
        <Route path="/page3" element={<Page3 />} />
      </Routes>
      <Footer />
      {/* <Tracker /> */}
      <BTester />
    </div>
  );
}

export default App;
