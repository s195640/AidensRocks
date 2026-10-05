import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { isPlainLeftClick, useUnsavedChangesGuard } from "../../context/UnsavedChangesContext.jsx";
import styles from "./Navbar.module.css";

// `account`: the signed-in account ({ firstName, ... }) or null when signed
// out — drives the far-right sign-in heart icon / "Hello, <name>" + Sign out block.
const Navbar = ({ navItems, account = null }) => {
  const [clicked, setClicked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { guardNavigate, isDirty } = useUnsavedChangesGuard();
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

  // Only intercepts when there's actually something unsaved to guard (see
  // UnsavedChangesContext.jsx) — a plain click on a link when nothing's
  // dirty behaves exactly as before (real anchor navigation, ctrl/cmd-click
  // still opens a new tab, etc.).
  const handleGuardedClick = (e, path) => {
    if (isPlainLeftClick(e) && isDirty()) {
      e.preventDefault();
      guardNavigate(() => {
        navigate(path);
        handleLinkClick();
      });
      return;
    }
    handleLinkClick();
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" onClick={(e) => handleGuardedClick(e, "/")}>
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
              onClick={(e) => handleGuardedClick(e, path)}
            >
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.rightGroup}>
        <div ref={buttonRef} onClick={toggleMenu} className={styles.mobileToggle}>
          <i className={clicked ? "fas fa-times" : "fas fa-bars"}></i>
        </div>

        {/* Account block: its own spot at the far right (right of the ☰ on
            phones), not a menu item. */}
        <div className={styles.account}>
          {account ? (
            <>
              <span className={styles.welcome}>
                {account.firstName ? `Hello, ${account.firstName}` : "Hello!"}
              </span>
              <Link
                to="/sign-out"
                className={styles.signOutLink}
                onClick={(e) => handleGuardedClick(e, "/sign-out")}
              >
                Sign out
              </Link>
            </>
          ) : (
            // A quiet icon rather than "Sign In" text, so signing in reads
            // as optional (it's for following rocks), not required.
            <Link
              to="/login"
              className={`${styles.signInLink} ${
                location.pathname === "/login" ? styles.signInActive : ""
              }`}
              title="Follow rocks & get travel updates"
              aria-label="Sign in to follow rocks"
              onClick={(e) => handleGuardedClick(e, "/login")}
            >
              <i className="far fa-heart" aria-hidden="true"></i>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
