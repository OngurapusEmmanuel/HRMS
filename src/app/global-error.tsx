"use client";

import { useEffect } from "react";

// Only fires if the root layout itself throws (rare — e.g. a font/provider
// init failure). Must render its own <html>/<body> since it replaces the
// entire root layout, and deliberately uses inline styles rather than
// Tailwind classes: if things are broken enough to hit this boundary, don't
// also depend on globals.css having loaded correctly.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f8fb", color: "#10131a" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
            <p style={{ marginTop: 8, fontSize: 14, color: "#4b5165" }}>
              A critical error occurred. {error.digest && <span>(ref: {error.digest})</span>}
            </p>
          </div>
          <button
            onClick={reset}
            style={{
              background: "#3b5bdb",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
