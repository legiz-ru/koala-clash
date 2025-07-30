import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { useLockFn } from "ahooks";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

// Новые импорты
import { useVerge } from "@/hooks/use-verge";
import { DialogRef, Switch } from "@/components/base";
import { TooltipIcon } from "@/components/base/base-tooltip-icon";
import { GuardState } from "./guard-state";
import { copyIconFile, getAppDir } from "@/services/cmds";
import { showNotice } from "@/services/noticeService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import getSystem from "@/utils/get-system";

const OS = getSystem();

const getIcons = async (icon_dir: string, name: string) => {
  const updateTime = localStorage.getItem(`icon_${name}_update_time`) || "";
  const icon_png = await join(icon_dir, `${name}-${updateTime}.png`);
  const icon_ico = await join(icon_dir, `${name}-${updateTime}.ico`);
  return { icon_png, icon_ico };
};

// Наш переиспользуемый компонент для строки настроек
const SettingRow = ({
  label,
  extra,
  children,
}: {
  label: React.ReactNode;
  extra?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
    <div className="flex items-center gap-2">
      <p className="text-sm font-medium">{label}</p>
      {extra && <div className="text-muted-foreground">{extra}</div>}
    </div>
    <div>{children}</div>
  </div>
);

export const LayoutViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const { verge, patchVerge, mutateVerge } = useVerge();

  const [open, setOpen] = useState(false);
  const [commonIcon, setCommonIcon] = useState("");
  const [sysproxyIcon, setSysproxyIcon] = useState("");
  const [tunIcon, setTunIcon] = useState("");

  const initIconPath = useCallback(async () => {
    const appDir = await getAppDir();
    const icon_dir = await join(appDir, "icons");
    const { icon_png: common_icon_png, icon_ico: common_icon_ico } =
      await getIcons(icon_dir, "common");
    const { icon_png: sysproxy_icon_png, icon_ico: sysproxy_icon_ico } =
      await getIcons(icon_dir, "sysproxy");
    const { icon_png: tun_icon_png, icon_ico: tun_icon_ico } = await getIcons(
      icon_dir,
      "tun",
    );

    setCommonIcon(
      (await exists(common_icon_ico)) ? common_icon_ico : common_icon_png,
    );
    setSysproxyIcon(
      (await exists(sysproxy_icon_ico)) ? sysproxy_icon_ico : sysproxy_icon_png,
    );
    setTunIcon((await exists(tun_icon_ico)) ? tun_icon_ico : tun_icon_png);
  }, []);

  useEffect(() => {
    if (open) initIconPath();
  }, [open, initIconPath]);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const onSwitchFormat = (_e: any, value: boolean) => value;
  const onError = (err: any) => {
    showNotice("error", err.message || err.toString());
  };
  const onChangeData = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };

  const handleIconChange = useLockFn(
    async (type: "common" | "sysproxy" | "tun") => {
      const key = `${type}_tray_icon` as keyof IVergeConfig;
      if (verge?.[key]) {
        onChangeData({ [key]: false });
        await patchVerge({ [key]: false });
      } else {
        const selected = await openDialog({
          directory: false,
          multiple: false,
          filters: [{ name: "Tray Icon Image", extensions: ["png", "ico"] }],
        });
        if (selected) {
          const path = Array.isArray(selected) ? selected[0] : selected;
          await copyIconFile(path, type);
          await initIconPath();
          onChangeData({ [key]: true });
          await patchVerge({ [key]: true });
        }
      }
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Layout Setting")}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-1">
          <SettingRow label={t("Memory Usage")}>
            <GuardState
              value={verge?.enable_memory_usage ?? true}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ enable_memory_usage: e })}
              onGuard={(e) => patchVerge({ enable_memory_usage: e })}
            >
              <Switch />
            </GuardState>
          </SettingRow>

          <SettingRow label={t("Proxy Group Icon")}>
            <GuardState
              value={verge?.enable_group_icon ?? true}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ enable_group_icon: e })}
              onGuard={(e) => patchVerge({ enable_group_icon: e })}
            >
              <Switch />
            </GuardState>
          </SettingRow>

          <SettingRow
            label={t("Hover Jump Navigator")}
            extra={<TooltipIcon tooltip={t("Hover Jump Navigator Info")} />}
          >
            <GuardState
              value={verge?.enable_hover_jump_navigator ?? true}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ enable_hover_jump_navigator: e })}
              onGuard={(e) => patchVerge({ enable_hover_jump_navigator: e })}
            >
              <Switch />
            </GuardState>
          </SettingRow>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("Close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
