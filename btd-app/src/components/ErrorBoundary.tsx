import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/** Keeps one broken component from blanking the whole site.
 *
 *  React unmounts the entire tree when a render or an effect throws, which
 *  leaves the paper background and nothing else — no way for someone to tell
 *  the difference between "this is broken" and "this is still loading." A
 *  person mid-way through preparing for an appointment deserves better than a
 *  blank page, so show them something honest and a way out. */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="btd-card max-w-md p-6">
          <h1 className="font-display text-2xl font-semibold mb-2">
            Something went wrong on our end
          </h1>
          <p className="text-slate mb-5">
            Nothing you typed was lost from this device. Reloading usually fixes it.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded bg-ink text-paper font-semibold text-sm"
            >
              Reload the page
            </button>
            <a
              href="/"
              className="px-4 py-2.5 rounded border border-ink/20 font-semibold text-sm"
            >
              Go to the home page
            </a>
          </div>
          <details className="mt-5">
            <summary className="text-xs text-slate cursor-pointer">
              Technical details
            </summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-slate">
              {this.state.error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
