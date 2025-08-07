import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

const Navbar = ({ navItems }) => {
  const [clicked, setClicked] = useState(false);
  const location = useLocation();
  const navRef = useRef();
  const buttonRef = useRef();

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clicked]);

  useEffect(() => {
    document.body.style.overflow = clicked ? "hidden" : "auto";
  }, [clicked]);

  const toggleMenu = () => setClicked((prev) => !prev);
  const handleLinkClick = () => {
    setClicked(false);
    window.scrollTo(0, 0);
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" onClick={handleLinkClick}>
        <img src="/logo.webp" alt="Logo" className={styles.logo} />
      </Link>

      <ul
        ref={navRef}
        className={`${styles.navList} ${clicked ? styles.showMenu : ""}`}
      >
        {navItems.map(({ path, label }) => (
          <li key={path} className={styles.navItem}>
            <Link
              to={path}
              className={`${styles.navLink} ${
                location.pathname === path ? styles.activeLink : ""
              }`}
              onClick={handleLinkClick}
            >
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div ref={buttonRef} onClick={toggleMenu} className={styles.mobileToggle}>
        <i className={clicked ? "fas fa-times" : "fas fa-bars"}></i>
      </div>
    </nav>
  );
};

export default Navbar;
