import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@okkly/design-system/styles/index.scss";
import "@okkly/react/style.css";
import "./styles/app.scss";

import { ConsentProvider } from "./components/consent/ConsentProvider.js";
import { loadGoogleAnalytics } from "./lib/analytics.js";
import { I18nProvider } from "./i18n/I18nProvider.js";
import { App } from "./App.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// After the consent defaults from index.html are already in dataLayer, and a no-op in
// development. Consent Mode decides whether the hits it sends carry cookies.
loadGoogleAnalytics();

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ConsentProvider>
          <App />
        </ConsentProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
