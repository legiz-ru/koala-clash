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
          <SettingRow label={t("Traffic Graph")}>
            <GuardState
              value={verge?.traffic_graph ?? true}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ traffic_graph: e })}
              onGuard={(e) => patchVerge({ traffic_graph: e })}
            >
              <Switch />
            </GuardState>
          </SettingRow>

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

          <SettingRow label={t("Nav Icon")}>
            <GuardState
              value={verge?.menu_icon ?? "monochrome"}
              onCatch={onError}
              onFormat={(v) => v}
              onChange={(e) => onChangeData({ menu_icon: e })}
              onGuard={(e) => patchVerge({ menu_icon: e })}
            >
              {/* --- НАЧАЛО ИЗМЕНЕНИЙ 1 --- */}
              <Select
                onValueChange={(value) =>
                  onChangeData({ menu_icon: value as any })
                }
                value={verge?.menu_icon}
              >
                {/* --- КОНЕЦ ИЗМЕНЕНИЙ 1 --- */}
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monochrome">{t("Monochrome")}</SelectItem>
                  <SelectItem value="colorful">{t("Colorful")}</SelectItem>
                  <SelectItem value="disable">{t("Disable")}</SelectItem>
                </SelectContent>
              </Select>
            </GuardState>
          </SettingRow>

          {OS === "macos" && (
            <>
              <SettingRow label={t("Tray Icon")}>
                <GuardState
                  value={verge?.tray_icon ?? "monochrome"}
                  onCatch={onError}
                  onFormat={(v) => v}
                  onChange={(e) => onChangeData({ tray_icon: e })}
                  onGuard={(e) => patchVerge({ tray_icon: e })}
                >
                  {/* --- НАЧАЛО ИЗМЕНЕНИЙ 2 --- */}
                  <Select
                    onValueChange={(value) =>
                      onChangeData({ tray_icon: value as any })
                    }
                    value={verge?.tray_icon}
                  >
                    {/* --- КОНЕЦ ИЗМЕНЕНИЙ 2 --- */}
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monochrome">
                        {t("Monochrome")}
                      </SelectItem>
                      <SelectItem value="colorful">{t("Colorful")}</SelectItem>
                    </SelectContent>
                  </Select>
                </GuardState>
              </SettingRow>

              <SettingRow label={t("Enable Tray Icon")}>
                <GuardState
                  value={verge?.enable_tray_icon ?? true}
                  valueProps="checked"
                  onCatch={onError}
                  onFormat={onSwitchFormat}
                  onChange={(e) => onChangeData({ enable_tray_icon: e })}
                  onGuard={(e) => patchVerge({ enable_tray_icon: e })}
                >
                  <Switch />
                </GuardState>
              </SettingRow>
            </>
          )}

          <SettingRow label={t("Common Tray Icon")}>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleIconChange("common")}
            >
              {verge?.common_tray_icon && commonIcon && (
                <img
                  src={convertFileSrc(commonIcon)}
                  className="h-5 mr-2"
                  alt="common tray icon"
                />
              )}
              {verge?.common_tray_icon ? t("Clear") : t("Browse")}
            </Button>
          </SettingRow>

          <SettingRow label={t("System Proxy Tray Icon")}>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleIconChange("sysproxy")}
            >
              {verge?.sysproxy_tray_icon && sysproxyIcon && (
                <img
                  src={convertFileSrc(sysproxyIcon)}
                  className="h-5 mr-2"
                  alt="system proxy tray icon"
                />
              )}
              {verge?.sysproxy_tray_icon ? t("Clear") : t("Browse")}
            </Button>
          </SettingRow>

          <SettingRow label={t("Tun Tray Icon")}>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleIconChange("tun")}
            >
              {verge?.tun_tray_icon && tunIcon && (
                <img
                  src={convertFileSrc(tunIcon)}
                  className="h-5 mr-2"
                  alt="tun mode tray icon"
                />
              )}
              {verge?.tun_tray_icon ? t("Clear") : t("Browse")}
            </Button>
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
