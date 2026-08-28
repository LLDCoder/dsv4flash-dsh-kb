import React from "react";
import ReactDOM from "react-dom";
import { Router } from "react-router-dom";
import { history } from "@/utils/history";
import App from "./App";
import { initAppConfig } from "@/config/appConfig";
import { installUnauthorizedMessageGuard } from "@/utils/messageGuard";

import "./index.css";

installUnauthorizedMessageGuard();

Promise.allSettled([initAppConfig()]).finally(() => {
  ReactDOM.render(
    <React.StrictMode>
      <Router history={history}>
        <App />
      </Router>
    </React.StrictMode>,
    document.getElementById("root")
  );
});
