import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import App from "./App";

import AuthProvider from "./context/AuthProvider";
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

        <AuthProvider>

          <ThemeProvider>

            <App />

            <Toaster position="top-right" />

          </ThemeProvider>

        </AuthProvider>

    </QueryProvider>

    </BrowserRouter>

  </React.StrictMode>,
);
