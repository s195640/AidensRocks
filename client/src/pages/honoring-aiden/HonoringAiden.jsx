import { useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import HONORING_AIDEN_MENU_ITEMS from "./honoringAidenMenuItems";
import styles from "./HonoringAiden.module.css";

const SubPage = ({ label }) => (
  <div>
    <h2>{label}</h2>
    <p>Content coming soon.</p>
  </div>
);

const HonoringAiden = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef();
  const toggleRef = useRef();

  // Same click-outside/scroll-lock pattern as Navbar.jsx's mobile menu.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Route change (item click) should always close the mobile drawer.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.page}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-controls="honoring-aiden-sidebar"
      >
        <i className={menuOpen ? "fas fa-times" : "fas fa-bars"}></i>
        <span>Menu</span>
      </button>

      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}

      <aside
        id="honoring-aiden-sidebar"
        ref={sidebarRef}
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      >
        <ul className={styles.menuList}>
          {HONORING_AIDEN_MENU_ITEMS.map(({ slug, label }) => (
            <li key={slug}>
              <NavLink
                to={slug}
                className={({ isActive }) =>
                  `${styles.menuLink} ${isActive ? styles.menuLinkActive : ""}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      <div className={styles.content}>
        <Routes>
          <Route
            index
            element={<p>Select a topic from the menu to learn more.</p>}
          />
          {HONORING_AIDEN_MENU_ITEMS.map(({ slug, label }) => (
            <Route key={slug} path={slug} element={<SubPage label={label} />} />
          ))}
        </Routes>
      </div>
    </div>
  );
};

export default HonoringAiden;
