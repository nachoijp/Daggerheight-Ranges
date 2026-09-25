import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { SmallLabel } from "./SmallLabel";

export function FieldLabel({
  id,
  children,
  tooltip,
}: {
  id?: string;
  children: React.ReactNode;
  tooltip: React.ReactNode;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <SmallLabel id={id} sx={{ mb: 0 }}>
        {children}
      </SmallLabel>
      <Tooltip title={tooltip}>
        <InfoOutlined sx={{ fontSize: 14, opacity: 0.6 }} />
      </Tooltip>
    </Stack>
  );
}
