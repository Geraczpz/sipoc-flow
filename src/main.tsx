import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If a Supabase recovery link landed on any route with tokens in the hash,
// rewrite the URL to /reset-password BEFORE the router mounts, preserving the hash.
(() => {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const isRecovery =
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    new URLSearchParams(search).has("code");
  if (isRecovery && window.location.pathname !== "/reset-password") {
    window.history.replaceState(null, "", "/reset-password" + search + hash);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
