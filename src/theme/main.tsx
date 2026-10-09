import React from "react";
import ReactDOM from "react-dom/client";

import { ThemeSelector } from "./ThemeSelector";
import { PluginGate } from "../util/PluginGate";
import { PluginThemeProvider } from "../util/PluginThemeProvider";
import { GlassFrame } from "../util/GlassFrame";
import CssBaseline from "@mui/material/CssBaseline";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PluginGate>
      <PluginThemeProvider>
        <CssBaseline />
        <GlassFrame>
          <ThemeSelector />
        </GlassFrame>
      </PluginThemeProvider>
    </PluginGate>
  </React.StrictMode>
);
