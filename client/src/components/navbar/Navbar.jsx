import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ navItems }) => {
  const [clicked, setClicked] = useState(false);
  const location = useLocation();
  const navRef = useRef();
  const buttonRef = useRef();

  // Close menu when clicking outside nav and toggle button
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        clicked &&
        navRef.current &&
        !navRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setClicked(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [clicked]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.classList.toggle("nav-open", clicked);
  }, [clicked]);

  const toggleMenu = () => setClicked((prev) => !prev);
  const closeMenu = () => setClicked(false);

  return (
    <nav>
      <Link to="/" onClick={closeMenu}>
        <img src="/Artboard.svg" alt="Logo" width="60" height="60" />
      </Link>

      <ul id="navbar" ref={navRef} className={clicked ? "active" : ""}>
        {navItems.map(({ path, label }) => (
          <li key={path}>
            <Link
              to={path}
              className={location.pathname === path ? "active" : ""}
              onClick={closeMenu}
            >
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div id="mobile" ref={buttonRef} onClick={toggleMenu}>
        <i className={clicked ? "fas fa-times" : "fas fa-bars"}></i>
      </div>
    </nav>
  );
};

export default Navbar;
