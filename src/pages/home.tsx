import React, { useRef, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useProfiles } from "@/hooks/use-profiles";
import {
  ProfileViewer,
  ProfileViewerRef,
} from "@/components/profile/profile-viewer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronsUpDown,
  Check,
  PlusCircle,
  Menu,
  Wrench,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useVerge } from "@/hooks/use-verge";
import { useSystemState } from "@/hooks/use-system-state";
import { useServiceInstaller } from "@/hooks/useServiceInstaller";
import { Switch } from "@/components/ui/switch";
import { ProxySelectors } from "@/components/home/proxy-selectors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { closeAllConnections } from "@/services/api";

const MinimalHomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isToggling, setIsToggling] = useState(false);
  const { profiles, patchProfiles, activateSelected, mutateProfiles } =
    useProfiles();
  const viewerRef = useRef<ProfileViewerRef>(null);

  const profileItems = useMemo(() => {
    const items =
      profiles && Array.isArray(profiles.items) ? profiles.items : [];
    const allowedTypes = ["local", "remote"];
    return items.filter((i: any) => i && allowedTypes.includes(i.type!));
  }, [profiles]);

  const currentProfileName = useMemo(() => {
    return (
      profileItems.find((p) => p.uid === profiles?.current)?.name ||
      profiles?.current
    );
  }, [profileItems, profiles?.current]);
  const activateProfile = useCallback(
    async (uid: string, notifySuccess: boolean) => {
      try {
        await patchProfiles({ current: uid });
        await closeAllConnections();
        await activateSelected();
        if (notifySuccess) {
          toast.success(t("Profile Switched"));
        }
      } catch (err: any) {
        toast.error(err.message || err.toString());
        mutateProfiles();
      }
    },
    [patchProfiles, activateSelected, mutateProfiles, t],
  );

  const handleProfileChange = useLockFn(async (uid: string) => {
    if (profiles?.current === uid) return;
    await activateProfile(uid, true);
  });

  const { verge, patchVerge, mutateVerge } = useVerge();
  const { isAdminMode, isServiceMode } = useSystemState();
  const { installServiceAndRestartCore } = useServiceInstaller();
  const isTunAvailable = isServiceMode || isAdminMode;
  const isProxyEnabled = verge?.enable_system_proxy || verge?.enable_tun_mode;
  const showTunAlert =
    (verge?.primary_action ?? "tun-mode") === "tun-mode" && !isTunAvailable;

  const handleToggleProxy = useLockFn(async () => {
    const turningOn = !isProxyEnabled;
    const primaryAction = verge?.primary_action || "tun-mode";
    setIsToggling(true);

    try {
      if (turningOn) {
        if (primaryAction === "tun-mode") {
          if (!isTunAvailable) {
            toast.error(t("TUN requires Service Mode or Admin Mode"));
            setIsToggling(false);
            return;
          }
          await patchVerge({
            enable_tun_mode: true,
            enable_system_proxy: false,
          });
        } else {
          await patchVerge({
            enable_system_proxy: true,
            enable_tun_mode: false,
          });
        }
        toast.success(t("Proxy enabled"));
      } else {
        await patchVerge({
          enable_tun_mode: false,
          enable_system_proxy: false,
        });
        toast.success(t("Proxy disabled"));
      }
      mutateVerge();
    } catch (error: any) {
      toast.error(t("Failed to toggle proxy"), { description: error.message });
    } finally {
      setIsToggling(false);
    }
  });

  const navMenuItems = [
    { label: "Profiles", path: "/profile" },
    { label: "Settings", path: "/settings" },
    { label: "Logs", path: "/logs" },
    { label: "Proxies", path: "/proxies" },
    { label: "Connections", path: "/connections" },
    { label: "Rules", path: "/rules" },
  ];

  return (
    <div className="flex flex-col h-screen p-5">
      <header className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-20">
        <div className="w-10"></div>

        {profileItems.length > 0 && (
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full max-w-[250px] sm:max-w-xs"
                >
                  <span className="truncate">{currentProfileName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuLabel>{t("Profiles")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profileItems.map((p) => (
                  <DropdownMenuItem
                    key={p.uid}
                    onSelect={() => handleProfileChange(p.uid)}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    {profiles?.current === p.uid && (
                      <Check className="ml-4 h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => viewerRef.current?.create()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>{t("Add Profile")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="w-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("Menu")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onSelect={() => navigate(item.path)}
                >
                  {t(item.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex items-center justify-center flex-grow w-full">
        <div className="flex flex-col items-center gap-8 pt-10">
          <div className="text-center">
            <h1
              className="text-4xl mb-2 font-semibold"
              style={{ color: isProxyEnabled ? "#22c55e" : "#ef4444" }}
            >
              {isProxyEnabled ? t("Connected") : t("Disconnected")}
            </h1>
            <p className="h-6 text-sm text-muted-foreground transition-opacity duration-300">
              {isToggling &&
                (isProxyEnabled ? t("Disconnecting...") : t("Connecting..."))}
            </p>
          </div>

          <div className="scale-[7] my-16">
            <Switch
              disabled={showTunAlert || isToggling}
              checked={!!isProxyEnabled}
              onCheckedChange={handleToggleProxy}
              aria-label={t("Toggle Proxy")}
            />
          </div>

          {showTunAlert && (
            <div className="w-full max-w-sm">
              <Alert
                variant="destructive"
                className="flex flex-col items-center gap-2 text-center"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("Attention Required")}</AlertTitle>
                <AlertDescription className="text-xs">
                  {t("TUN requires Service Mode or Admin Mode")}
                </AlertDescription>
                {!isServiceMode && !isAdminMode && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={installServiceAndRestartCore}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    {t("Install Service")}
                  </Button>
                )}
              </Alert>
            </div>
          )}

          <div className="w-full mt-4 flex justify-center">
            {profileItems.length > 0 ? (
              <ProxySelectors />
            ) : (
              <Alert className="flex flex-col items-center gap-2 text-center">
                <PlusCircle className="h-4 w-4" />
                <AlertTitle>{t("Get Started")}</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {t(
                    "You don't have any profiles yet. Add your first one to begin.",
                  )}
                </AlertDescription>
                <Button
                  className="mt-2"
                  onClick={() => viewerRef.current?.create()}
                >
                  {t("Add Profile")}
                </Button>
              </Alert>
            )}
          </div>
        </div>
      </div>

      <ProfileViewer ref={viewerRef} onChange={() => mutateProfiles()} />
    </div>
  );
};

export default MinimalHomePage;
