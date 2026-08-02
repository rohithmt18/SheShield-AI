import { Component } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

/**
 * Last line of defence against a blank page.
 *
 * A render error in React 19 unmounts the whole tree, and an app whose job is
 * to warn someone about harm must never fail by showing nothing at all — a
 * black screen is indistinguishable from "everything here is fine". This turns
 * a crash into a visible statement that screening has stopped.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[vibe] render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-risk-critical/40 bg-risk-critical/10 p-6">
          <AlertOctagon className="mb-3 size-7 text-risk-critical" />
          <h1 className="text-lg font-bold">This app stopped running</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something broke while rendering, so <strong className="text-foreground">nothing on
            screen is being screened right now</strong>. Do not read a quiet page as a safe one.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-black/40 p-3 text-[11px] text-muted-foreground">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            <RefreshCw className="size-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
