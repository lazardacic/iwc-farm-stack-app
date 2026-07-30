import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import App from "./App";

import ThemeProvider from "./context/ThemeProvider";
import QueryProvider from "./providers/QueryProvider";

import "./styles/globals.css";


ReactDOM.createRoot(
  document.getElementById("root")!,
).render(
  <React.StrictMode>

    <QueryProvider>

      <ThemeProvider>

        <BrowserRouter>

          <App />

        </BrowserRouter>

      </ThemeProvider>

    </QueryProvider>

  </React.StrictMode>,
);
