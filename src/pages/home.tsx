import React, { useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLockFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Импорты
import { useProfiles } from '@/hooks/use-profiles';
import { ProfileViewer, ProfileViewerRef } from '@/components/profile/profile-viewer';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check, PlusCircle, Menu, Wrench, AlertTriangle } from 'lucide-react';
import { useVerge } from '@/hooks/use-verge';
import { useSystemState } from '@/hooks/use-system-state';
import { useServiceInstaller } from '@/hooks/useServiceInstaller';
import { Switch } from "@/components/ui/switch";
import { ProxySelectors } from '@/components/home/proxy-selectors';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { closeAllConnections } from '@/services/api';


const MinimalHomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // --- НАЧАЛО ИЗМЕНЕНИЙ 1: Правильно используем хук ---
  const { profiles, patchProfiles, activateSelected, mutateProfiles } = useProfiles();
  const viewerRef = useRef<ProfileViewerRef>(null);

  // Воссоздаем логику фильтрации профилей здесь
  const profileItems = useMemo(() => {
    const items = profiles && Array.isArray(profiles.items) ? profiles.items : [];
    const allowedTypes = ["local", "remote"];
    // Добавляем явное указание типа, чтобы избежать ошибок
    return items.filter((i: any) => i && allowedTypes.includes(i.type!));
  }, [profiles]);

  const currentProfileName = useMemo(() => {
    // Находим в списке профилей тот, чей uid совпадает с активным
    return profileItems.find(p => p.uid === profiles?.current)?.name || profiles?.current;
  }, [profileItems, profiles?.current]);
  // Воссоздаем логику активации профиля здесь
  const activateProfile = useCallback(async (uid: string, notifySuccess: boolean) => {
    try {
      await patchProfiles({ current: uid });
      await closeAllConnections();
      await activateSelected();
      if (notifySuccess) {
        toast.success(t("Profile Switched"));
      }
    } catch (err: any) {
      toast.error(err.message || err.toString());
      mutateProfiles(); // Откатываем в случае ошибки
    }
  }, [patchProfiles, activateSelected, mutateProfiles, t]);

  const handleProfileChange = useLockFn(async (uid: string) => {
    if (profiles?.current === uid) return;
    await activateProfile(uid, true);
  });
  // --- КОНЕЦ ИЗМЕНЕНИЙ 1 ---

  const { verge, patchVerge, mutateVerge } = useVerge();
  const { isAdminMode, isServiceMode } = useSystemState();
  const { installServiceAndRestartCore } = useServiceInstaller();
  const isTunAvailable = isServiceMode || isAdminMode;
  const isProxyEnabled = verge?.enable_system_proxy || verge?.enable_tun_mode;

  const handleToggleProxy = useLockFn(async () => {
    const turningOn = !isProxyEnabled;
    try {
      if (turningOn) {
        await patchVerge({ enable_tun_mode: true, enable_system_proxy: false });
        toast.success(t('Proxy enabled'));
      } else {
        await patchVerge({ enable_tun_mode: false, enable_system_proxy: false });
        toast.success(t('Proxy disabled'));
      }
      mutateVerge();
    } catch (error: any) {
      toast.error(t('Failed to toggle proxy'), { description: error.message });
    }
  });

  const navMenuItems = [
    { label: 'Profiles', path: '/profile' },
    { label: 'Settings', path: '/settings' },
    { label: 'Logs', path: '/logs' },
    { label: 'Proxies', path: '/proxies' },
    { label: 'Connections', path: '/connections' },
    { label: 'Rules', path: '/rules' },
  ];

  return (
    <div className="flex flex-col h-screen p-5">
      <header className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xs pt-5 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
             <Button variant="outline" className="w-full">
              <span className="truncate">{currentProfileName}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
             </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
            <DropdownMenuLabel>{t("Profiles")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profileItems.map((p) => (
              <DropdownMenuItem key={p.uid} onSelect={() => handleProfileChange(p.uid)}>
                <span className="flex-1 truncate">{p.name}</span>
                {profiles?.current === p.uid && <Check className="ml-4 h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => viewerRef.current?.create()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>{t("Add New Profile")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="absolute top-5 right-5 z-20">
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
                <DropdownMenuItem key={item.path} onSelect={() => navigate(item.path)}>
                  {t(item.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
      </div>


      <div className="flex flex-col items-center justify-center flex-grow text-center w-full">
        <h1 className="text-4xl mb-8 font-semibold" style={{ color: isProxyEnabled ? '#22c55e' : '#ef4444' }}>
          {isProxyEnabled ? t('Connected') : t('Disconnected')}
        </h1>

        <div className="scale-[3.5] my-16">
          <Switch
            disabled={!isTunAvailable}
            checked={!!isProxyEnabled}
            onCheckedChange={handleToggleProxy}
            aria-label={t("Toggle Proxy")}
          />
        </div>

        <div className="w-full max-w-sm transition-all">
          {!isTunAvailable && (
            <Alert variant="destructive" className="text-center flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>{t("Attention Required")}</AlertTitle>
              </div>
              <AlertDescription>
                {t("TUN requires Service Mode or Admin Mode")}
              </AlertDescription>
              {!isServiceMode && !isAdminMode && (
                  <Button size="sm" className="mt-2" onClick={installServiceAndRestartCore}>
                      <Wrench className="mr-2 h-4 w-4" />
                      {t("Install Service")}
                  </Button>
              )}
            </Alert>
          )}
        </div>

        <div className="w-full mt-8">
            <ProxySelectors />
        </div>
      </div>

      <ProfileViewer ref={viewerRef} onChange={() => mutateProfiles()} />
    </div>
  );
};

export default MinimalHomePage;
