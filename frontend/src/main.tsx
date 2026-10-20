import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import App from "./App";

import AuthSession from "./components/auth/AuthSession";
import ThemeProvider from "./context/ThemeProvider";
import QueryProvider from "./providers/QueryProvider";
import { Toaster } from "react-hot-toast";

import "./styles/globals.css";


ReactDOM.createRoot(
  document.getElementById("root")!,
).render(
  <React.StrictMode>

    <BrowserRouter>

    <QueryProvider>

        <AuthSession />

        <ThemeProvider>

          <App />

          <Toaster position="top-right" />

        </ThemeProvider>

    </QueryProvider>

    </BrowserRouter>

  </React.StrictMode>,
);
