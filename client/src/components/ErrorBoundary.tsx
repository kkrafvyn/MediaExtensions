import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page container stack" style={{ maxWidth: 520, paddingTop: "3rem" }}>
          <h1>Something went wrong</h1>
          <p className="lede">Try refreshing the page. If it keeps happening, contact us from the help links below.</p>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Refresh
            </button>
            <Link to="/contact" className="btn btn-light">
              Contact support
            </Link>
            <Link to="/" className="btn btn-light">
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
