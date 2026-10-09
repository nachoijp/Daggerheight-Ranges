import React from "react";
import ReactDOM from "react-dom/client";

import CssBaseline from "@mui/material/CssBaseline";

import { DistancePanel } from "./DistancePanel";
import { PluginGate } from "../util/PluginGate";
import { PluginThemeProvider } from "../util/PluginThemeProvider";
import { GlassFrame } from "../util/GlassFrame";
import { OBRContextProvider } from "../settings/OBRContext";

import "../settings/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PluginGate>
      <PluginThemeProvider>
        <CssBaseline />
        <OBRContextProvider>
          <GlassFrame>
            <DistancePanel />
          </GlassFrame>
        </OBRContextProvider>
      </PluginThemeProvider>
    </PluginGate>
  </React.StrictMode>
);
