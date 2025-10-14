import { Button, Grid, Stack, Typography } from "@mui/material";
import { useLockFn } from "ahooks";
import { memo } from "react";
import { useTranslation } from "react-i18next";

import { createLocalBackup } from "@/services/cmds";
import { showNotice } from "@/services/noticeService";

interface LocalBackupActionsProps {
  onBackupSuccess: () => Promise<void>;
  onRefresh: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const LocalBackupActions = memo(
  ({ onBackupSuccess, onRefresh, setLoading }: LocalBackupActionsProps) => {
    const { t } = useTranslation();

    const handleBackup = useLockFn(async () => {
      try {
        setLoading(true);
        await createLocalBackup();
        showNotice("success", t("Local Backup Created"));
        await onBackupSuccess();
      } catch (error) {
        console.error(error);
        showNotice("error", t("Local Backup Failed"));
      } finally {
        setLoading(false);
      }
    });

    const handleRefresh = useLockFn(async () => {
      setLoading(true);
      try {
        await onRefresh();
      } finally {
        setLoading(false);
      }
    });

    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 9 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Local Backup Info")}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Stack
            direction="column"
            alignItems="stretch"
            spacing={1.5}
            sx={{ height: "100%" }}
          >
            <Button
              variant="contained"
              color="success"
              onClick={handleBackup}
              type="button"
              size="large"
            >
              {t("Backup")}
            </Button>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              type="button"
              size="large"
            >
              {t("Refresh")}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    );
  },
);
