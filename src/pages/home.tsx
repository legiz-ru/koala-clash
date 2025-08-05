import React, {useRef, useMemo, useCallback, useState, useEffect} from "react";
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
  Wrench,
  AlertTriangle,
  Loader2,
  Globe,
  Send, ExternalLink, RefreshCw, ArrowDown, ArrowUp,
} from "lucide-react";
import { useVerge } from "@/hooks/use-verge";
import { useSystemState } from "@/hooks/use-system-state";
import { useServiceInstaller } from "@/hooks/useServiceInstaller";
import { Switch } from "@/components/ui/switch";
import { ProxySelectors } from "@/components/home/proxy-selectors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { closeAllConnections } from "@/services/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updateProfile } from "@/services/cmds";
import { SidebarTrigger } from "@/components/ui/sidebar";
import parseTraffic from "@/utils/parse-traffic";
import { useAppData } from "@/providers/app-data-provider";
import { PowerButton } from "@/components/home/power-button";
import { cn } from "@root/lib/utils";
import map from "../assets/image/map.svg";

const MinimalHomePage: React.FC = () => {
  const { t } = useTranslation();
  const [isToggling, setIsToggling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { profiles, patchProfiles, activateSelected, mutateProfiles } =
    useProfiles();
  const viewerRef = useRef<ProfileViewerRef>(null);
  const [uidToActivate, setUidToActivate] = useState<string | null>(null);
  const { connections } = useAppData();

  const profileItems = useMemo(() => {
    const items =
      profiles && Array.isArray(profiles.items) ? profiles.items : [];
    const allowedTypes = ["local", "remote"];
    return items.filter((i: any) => i && allowedTypes.includes(i.type!));
  }, [profiles]);

  const currentProfile = useMemo(() => {
    return profileItems.find(p => p.uid === profiles?.current);
  }, [profileItems, profiles?.current]);
  const currentProfileName = currentProfile?.name || profiles?.current;

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

  useEffect(() => {
    const uidToActivate = sessionStorage.getItem('activateProfile');
    if (uidToActivate && profileItems.some(p => p.uid === uidToActivate)) {
      activateProfile(uidToActivate, false);
      sessionStorage.removeItem('activateProfile');
    }
  }, [profileItems, activateProfile]);


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

  const handleUpdateProfile = useLockFn(async () => {
    if (!currentProfile?.uid || currentProfile.type !== 'remote') return;
    setIsUpdating(true);
    try {
      await updateProfile(currentProfile.uid);
      toast.success(t("Profile Updated Successfully"));
      mutateProfiles();
    } catch (err: any) {
      toast.error(t("Failed to update profile"), { description: err.message });
    } finally {
      setIsUpdating(false);
    }
  });

  const statusInfo = useMemo(() => {
    if (isToggling) {
      return {
        text: isProxyEnabled ? t('Disconnecting...') : t('Connecting...'),
        color: isProxyEnabled ? '#f59e0b' : '#84cc16',
        isAnimating: true,
      };
    }
    if (isProxyEnabled) {
      return {
        text: t('Connected'),
        color: '#22c55e',
        isAnimating: false,
      };
    }
    return {
      text: t('Disconnected'),
      color: '#ef4444',
      isAnimating: false,
    };
  }, [isToggling, isProxyEnabled, t]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0 [transform:translateZ(0)]">
        <img
            src={map}
            alt="World map"
            className="w-full h-full object-cover"
        />
      </div>

      {isProxyEnabled && (
          <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full pointer-events-none z-0 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)',
                filter: 'blur(100px)',
              }}
          />
      )}

      <header className="flex-shrink-0 p-5 grid grid-cols-3 items-center z-10">
        <div className="flex justify-start">
          <SidebarTrigger />
        </div>
       <div className="justify-self-center flex flex-col items-center gap-2">
          <div className="relative">
            {profileItems.length > 0 && (
              <div className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full max-w-[250px] sm:max-w-xs">
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
             {currentProfile?.type === 'remote' && (
              <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUpdateProfile}
                        disabled={isUpdating}
                        className="flex-shrink-0"
                      >
                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t("Update Profile")}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end">
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="relative flex flex-col items-center gap-8 py-10 w-full max-w-4xl px-4">
          {currentProfile?.announce && (
            <div className="absolute -top-15 w-full flex justify-center text-center max-w-lg">
              {currentProfile.announce_url ? (
                <a
                  href={currentProfile.announce_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-base font-semibold text-foreground hover:underline hover:opacity-80 transition-all whitespace-pre-wrap"
                  title={currentProfile.announce_url.replace(/\\n/g, '\n')}
                >
                  <span>{currentProfile.announce.replace(/\\n/g, '\n')}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              ) : (
                <p className="text-base font-semibold text-foreground whitespace-pre-wrap">
                  {currentProfile.announce}
                </p>
              )}
            </div>
          )}
            <div className="relative text-center">
              <h1
                  className={cn(
                      "text-4xl mb-2 font-semibold transition-colors duration-300",
                      statusInfo.isAnimating && "animate-pulse"
                  )}
                  style={{ color: statusInfo.color }}
              >
                {statusInfo.text}
              </h1>
            {isProxyEnabled && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-52 flex justify-center items-center text-sm text-muted-foreground gap-6">
                <div className="flex items-center gap-1">
                    <ArrowDown className="h-4 w-4 text-green-500" />
                    {parseTraffic(connections.downloadTotal)}
                </div>
                <div className="flex items-center gap-1">
                    <ArrowUp className="h-4 w-4 text-sky-500" />
                    {parseTraffic(connections.uploadTotal)}
                </div>
              </div>
            )}
          </div>

          <div className="relative -translate-y-6">
            <PowerButton
                loading={isToggling}
                checked={!!isProxyEnabled}
                onClick={handleToggleProxy}
                disabled={showTunAlert || isToggling || profileItems.length === 0}
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

          <div className="w-full max-w-sm mt-4 flex justify-center">
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
      </main>
      <footer className="flex justify-center p-4 flex-shrink-0">
        {currentProfile?.support_url && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("Support")}:</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a href={currentProfile.support_url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">
                                {(currentProfile.support_url.includes('t.me') || currentProfile.support_url.includes('telegram') || currentProfile.support_url.startsWith('tg://')) ? (
                                    <Send className="h-5 w-5" />
                                ) : (
                                    <Globe className="h-5 w-5" />
                                )}
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{currentProfile.support_url}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )}
      </footer>
      <ProfileViewer ref={viewerRef} onChange={() => mutateProfiles()} />
    </div>
  );
};

export default MinimalHomePage;
