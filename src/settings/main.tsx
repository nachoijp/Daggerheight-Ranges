import React from "react";
import ReactDOM from "react-dom/client";

import CssBaseline from "@mui/material/CssBaseline";

import { Settings } from "./Settings";
import { PluginGate } from "../util/PluginGate";
import { PluginThemeProvider } from "../util/PluginThemeProvider";
import { GlassFrame } from "../util/GlassFrame";
import { OBRContextProvider } from "./OBRContext";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PluginGate>
      <PluginThemeProvider>
        <CssBaseline />
        <OBRContextProvider>
          <GlassFrame>
            <Settings />
          </GlassFrame>
        </OBRContextProvider>
      </PluginThemeProvider>
    </PluginGate>
  </React.StrictMode>
);
