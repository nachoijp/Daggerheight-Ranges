import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "../i18n/useTranslation";

/** A single remappable letter hotkey: click, then press the new key. Rejects a key already used by another of the room's hotkeys instead of creating a silent collision. */
export function HotkeyRecorder({
  label,
  value,
  onChange,
  reservedLetters,
}: {
  label: string;
  value: string;
  onChange: (letter: string) => void;
  reservedLetters: string[];
}) {
  const [recording, setRecording] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (!recording) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      if (event.code === "Escape") {
        setRecording(false);
        return;
      }
      const match = /^Key([A-Z])$/.exec(event.code);
      if (!match) {
        return;
      }
      const letter = match[1];
      if (reservedLetters.includes(letter)) {
        // Stay in recording mode so the user can try a different key
        // instead of silently keeping the old value.
        return;
      }
      onChange(letter);
      setRecording(false);
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recording, reservedLetters, onChange]);

  return (
    <Stack alignItems="center" gap={0.25}>
      <Typography variant="caption" sx={{ textAlign: "center" }}>
        {label}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setRecording(true)}
        sx={{ minWidth: 72 }}
      >
        {recording ? t("settings.global.hotkeyRecording") : value}
      </Button>
    </Stack>
  );
}
