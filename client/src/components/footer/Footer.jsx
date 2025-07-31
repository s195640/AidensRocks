import "./Footer.css";

const Footer = () => {
  return (
    <div className="footer-content">
      <div className="footer-content-inner">
        <ul>
          <li>
            <a
              href="https://www.facebook.com/AidensRocks"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="icon-circle">
                <i className="fa-brands fa-facebook"></i>
              </div>
            </a>
          </li>
          <li>
            <a
              href="https://www.instagram.com/AidensRocks"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="icon-circle">
                <i className="fa-brands fa-instagram"></i>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Footer;
