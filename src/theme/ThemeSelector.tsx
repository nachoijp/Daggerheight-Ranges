import { useEffect, useLayoutEffect, useRef, useState } from "react";

import OBR from "@owlbear-rodeo/sdk";
import Stack from "@mui/material/Stack";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { alpha, useTheme } from "@mui/material/styles";

import {
  Color,
  CUSTOM_THEME,
  getCustomColors,
  getStoredTheme,
  MAX_CUSTOM_COLORS,
  saveCustomColors,
  THEME_POPOVER_ID,
  themes,
} from "./themes";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { DEFAULT_LANGUAGE, getLanguage, type Language } from "../i18n/language";
import { translate } from "../i18n/translate";
import { GLASS_FRAME } from "../util/glass";

// This page (unlike settings.html/token-height.html) isn't wrapped in
// OBRContextProvider — it only needs the current language, not the
// bandSet/gridScale fetches that come with the full context, so it reads it
// directly instead of via useTranslation().
function useLanguage() {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  useEffect(() => {
    let mounted = true;
    getLanguage().then((value) => {
      if (mounted) {
        setLanguage(value);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  return language;
}

function useThemeStorage() {
  const [theme, setTheme] = useState<string>(() => getStoredTheme().name);

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  }, [theme]);

  return [theme, setTheme] as const;
}

/**
 * Each change of the custom colors is a localStorage write, and every write
 * makes the GM's client recolor the height markers in the scene: a color
 * picker being dragged is saved once it rests.
 */
const SAVE_DELAY_MS = 300;

const toHex = (color: Color) =>
  "#" +
  [color.r, color.g, color.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");

function fromHex(hex: string): Color {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/** The custom theme's colors: the saved ones, or else a copy of the theme picked so far. */
function useCustomColors() {
  const [colors, setColors] = useState<Color[]>(
    () => getCustomColors() ?? getStoredTheme().colors,
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(colors);
  latest.current = colors;
  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveCustomColors(latest.current);
      }
    },
    [],
  );
  const update = (next: Color[]) => {
    setColors(next);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      saveCustomColors(next);
    }, SAVE_DELAY_MS);
  };
  return [colors, update] as const;
}

/** Keeps the popover as tall as the page's content. */
function useFitPopoverHeight() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    let height = 0;
    const observer = new ResizeObserver(() => {
      const next = Math.ceil(element.offsetHeight) + GLASS_FRAME;
      if (next !== height) {
        height = next;
        OBR.popover.setHeight(THEME_POPOVER_ID, next);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function CustomColorsEditor({
  colors,
  onChange,
  language,
}: {
  colors: Color[];
  onChange: (colors: Color[]) => void;
  language: Language;
}) {
  return (
    // The buttons sit in a column of their own, so adding or removing a color doesn't move them.
    <Stack
      direction="row"
      alignItems="flex-start"
      gap={0.5}
      sx={{ pl: 2, pr: 1, pb: 1 }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        gap={0.75}
        sx={{ flex: 1, py: 0.5 }}
      >
        {colors.map((color, index) => (
          <Box
            key={index}
            component="input"
            type="color"
            value={toHex(color)}
            aria-label={translate(language, "theme.color", { n: index + 1 })}
            title={translate(language, "theme.color", { n: index + 1 })}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange(
                colors.map((other, i) =>
                  i === index ? fromHex(event.target.value) : other,
                ),
              )
            }
            sx={{
              width: 28,
              height: 28,
              p: 0,
              border: 2,
              borderColor: "divider",
              borderRadius: "50%",
              bgcolor: "transparent",
              cursor: "pointer",
              // Only here, not on the page: a page whose color-scheme differs from
              // Owlbear's gets an opaque background from the browser. It's what
              // makes Chrome open its color picker dark in the dark theme.
              colorScheme: (theme) => theme.palette.mode,
              "&::-webkit-color-swatch-wrapper": { p: 0 },
              "&::-webkit-color-swatch": {
                border: "none",
                borderRadius: "50%",
              },
              "&::-moz-color-swatch": { border: "none", borderRadius: "50%" },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          />
        ))}
      </Stack>
      <Stack>
        <IconButton
          size="small"
          aria-label={translate(language, "theme.addColor")}
          title={translate(language, "theme.addColor")}
          disabled={colors.length >= MAX_CUSTOM_COLORS}
          onClick={() =>
            onChange([
              ...colors,
              themes[0].colors[colors.length % themes[0].colors.length],
            ])
          }
        >
          <AddRounded fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={translate(language, "theme.removeColor")}
          title={translate(language, "theme.removeColor")}
          disabled={colors.length <= 1}
          onClick={() => onChange(colors.slice(0, -1))}
        >
          <RemoveRounded fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}

export function ThemeSelector() {
  const muiTheme = useTheme();
  const language = useLanguage();
  const [selectedTheme, setSelectedTheme] = useThemeStorage();
  const [customColors, setCustomColors] = useCustomColors();
  const contentRef = useFitPopoverHeight();
  const [storageIsAvailable] = useState(() => {
    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
      return true;
    } catch (error) {
      return false;
    }
  });

  if (!storageIsAvailable) {
    return (
      <Alert severity="error" sx={{ height: "240px" }}>
        <AlertTitle>
          {translate(language, "theme.storageUnavailable")}
        </AlertTitle>
        {translate(language, "theme.storageUnavailableBody")}
      </Alert>
    );
  }

  const options = [
    ...themes.map((theme) => ({
      name: theme.name,
      label: theme.name,
      colors: theme.colors,
    })),
    {
      name: CUSTOM_THEME,
      label: translate(language, "theme.custom"),
      colors: customColors,
    },
  ];

  return (
    <Stack ref={contentRef}>
      <RadioGroup
        aria-label="theme"
        value={selectedTheme}
        onChange={(_, value) => {
          if (value === CUSTOM_THEME) {
            // Saved before the theme is, so it never reads as Custom with no colors.
            saveCustomColors(customColors);
          }
          setSelectedTheme(value);
        }}
        name="themes"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: 1,
        }}
      >
        {options.map((theme) => (
          <Box
            key={theme.name}
            sx={{
              position: "relative",
              "&:hover .theme-background": {
                opacity: theme.name === selectedTheme ? 1 : 0.75,
              },
            }}
          >
            <FormControlLabel
              value={theme.name}
              control={
                <Radio
                  color="primary"
                  sx={{
                    // A see-through disc of Owlbear's own background behind the
                    // circle, so the accent shows on any theme color the row has
                    // behind it. It ends just inside the ring's outer edge (the
                    // ring reaches 10 of the icon's 12 radius, ~83%; the disc
                    // stops at 78–80%) so no rim of it shows, and it's
                    // more solid in light mode, where a thin one looks washed out.
                    // (The first span is the icon; the ripple is the last one.)
                    "& > span:first-of-type": {
                      backgroundImage: `radial-gradient(circle closest-side, ${alpha(
                        muiTheme.palette.background.paper,
                        muiTheme.palette.mode === "light" ? 0.85 : 0.6
                      )} 78%, transparent 80%)`,
                      filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3))",
                    },
                  }}
                />
              }
              label={theme.label}
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                px: 1,
                py: 0.5,
              }}
              slotProps={{
                typography: {
                  fontWeight: 500,
                  // Readable over the brighter colors (yellow) the row shows
                  // behind it: a dark shadow under white text, a light glow
                  // under the black text of Owlbear's light mode.
                  sx: {
                    textShadow:
                      muiTheme.palette.mode === "light"
                        ? "0 1px 3px rgba(255, 255, 255, 0.7)"
                        : "0 1px 3px rgba(0, 0, 0, 0.7)",
                  },
                },
              }}
            />
            <Box
              className="theme-background"
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: -1,
                overflow: "hidden",
                opacity: theme.name === selectedTheme ? 0.9 : 0.55,
                transition: "opacity 0.2s ease-in-out",
                borderRadius: "12px",
              }}
              aria-hidden="true"
            >
              <Box
                sx={{
                  transform: "skew(-15deg) scale(1.1)",
                  display: "flex",
                  width: "100%",
                  height: "100%",
                }}
              >
                {theme.colors.map((color, index) => (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                    }}
                    key={index}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        ))}
      </RadioGroup>
      {selectedTheme === CUSTOM_THEME && (
        <CustomColorsEditor
          colors={customColors}
          onChange={setCustomColors}
          language={language}
        />
      )}
    </Stack>
  );
}
