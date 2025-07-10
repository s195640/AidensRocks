import { useState } from "react";
import { Link } from "react-router-dom";
import "./NavbarStyles.css";

const Navbar = () => {
  const [clicked, setClicked] = useState(false);
  const [page, setPage] = useState(0);
  const handleClick = () => {
    setClicked((o) => !o);
  };

  const pageClass = () => {
    return "nave-link";
  };
  return (
    <>
      <nav>
        <Link
          to="/"
          onClick={() => {
            setClicked(false);
            setPage(0);
          }}
        >
          <img src="/Artboard.svg" alt="Logo" width="60" height="60" />
        </Link>
        <div>
          <ul id="navbar" className={clicked ? "#navbar active" : "#navbar"}>
            <li>
              <Link
                to="/"
                className={page === 0 ? "active" : ""}
                onClick={() => {
                  setClicked(false);
                  setPage(0);
                }}
              >
                Aiden's Rocks
              </Link>
            </li>
            <li>
              <Link
                to="/page1"
                className={page === 1 ? "active" : ""}
                onClick={() => {
                  setClicked(false);
                  setPage(1);
                }}
              >
                Page 1
              </Link>
            </li>
            <li>
              <Link
                to="/page2"
                className={page === 2 ? "active" : ""}
                onClick={() => {
                  setClicked(false);
                  setPage(2);
                }}
              >
                Page 2
              </Link>
            </li>
            <li>
              <Link
                to="/page3"
                className={page === 3 ? "active" : ""}
                onClick={() => {
                  setClicked(false);
                  setPage(3);
                }}
              >
                Page 3
              </Link>
            </li>
          </ul>
        </div>
        <div id="mobile" onClick={handleClick}>
          <i id="bar" className={clicked ? "fas fa-times" : "fas fa-bars"}></i>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
