import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/**
 * Catches a crash while drawing the editor and shows a page instead of a blank screen. The working copy is saved in the browser
 * every second or so, so reloading brings the design back.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Farsha crashed", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <div className="crash__card">
          <h1 className="crash__title">Something went wrong</h1>
          <p className="crash__text">Farsha hit a problem and had to stop. Your work is kept in this browser, so reloading brings it back.</p>
          <div className="crash__actions">
            <button className="crash__button crash__button--primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a className="crash__button" href="https://github.com/Dolytro/farsha/issues/new" target="_blank" rel="noreferrer">
              Report an issue
            </a>
          </div>
          <details className="crash__details">
            <summary>Details</summary>
            <pre>{error.message}</pre>
          </details>
        </div>
      </div>
    );
  }
}

/** Development only: open the editor with `?crash-test` to see the crash page. */
export function CrashTest(): null {
  if (import.meta.env.DEV && typeof location !== "undefined" && location.search.includes("crash-test")) throw new Error("Crash test (?crash-test)");
  return null;
}
