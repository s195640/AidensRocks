// Catches a crash while drawing part of the site, so the visitor gets a
// gentle message instead of a blank white page, and reports it (Site
// Tracking, error tracking: render_crash).
//
//   where     short name for what's wrapped ("page", "map", "music")
//   resetKey  when it changes (e.g. the route), a crashed boundary tries
//             again, so navigating away from a broken page clears it
//   variant   "page" (full crash screen), "inline" (a small notice in
//             place of the broken part) or "hidden" (render nothing)
import { Component } from "react";
import { Link } from "react-router-dom";
import { reportCrash } from "../../utils/activity";
import styles from "./ErrorBoundary.module.css";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportCrash(error, info?.componentStack, this.props.where);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { variant = "page" } = this.props;
    if (variant === "hidden") return null;

    if (variant === "inline") {
      return (
        <div className={styles.inline} role="alert">
          This part of the page couldn&apos;t be shown.{" "}
          <button type="button" className={styles.linkButton} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }

    return (
      <div className={styles.page} role="alert">
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>
          We&apos;re sorry, this page ran into a problem. Reloading usually fixes it.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => window.location.reload()}>
            Reload the page
          </button>
          <Link to="/" className={styles.homeLink}>
            Go to the home page
          </Link>
        </div>
      </div>
    );
  }
}
