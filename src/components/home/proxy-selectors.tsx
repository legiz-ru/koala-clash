import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@root/lib/utils";

// Компоненты и иконки
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronsUpDown, Timer, WholeWord } from 'lucide-react';

// Логика
import { useVerge } from '@/hooks/use-verge';
import { useAppData } from '@/providers/app-data-provider';
import delayManager from '@/services/delay';
import { updateProxy, deleteConnection } from '@/services/api';

// --- Типы и константы ---
const STORAGE_KEY_GROUP = 'clash-verge-selected-proxy-group';
const STORAGE_KEY_SORT_TYPE = 'clash-verge-proxy-sort-type';
const presetList = ["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"];
type ProxySortType = 'default' | 'delay' | 'name';
interface IProxyGroup {
  name: string;
  type: string;
  now: string;
  hidden: boolean;
  all: (string | { name: string })[];
}

// --- Вспомогательная функция для цвета задержки ---
function getDelayBadgeVariant(delayValue: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (delayValue < 0) return 'secondary';
  if (delayValue >= 150) return 'destructive';
  return 'default';
}

// --- Дочерний компонент для элемента списка с "живым" обновлением пинга ---
const ProxySelectItem = ({ proxyName, groupName }: { proxyName: string, groupName: string }) => {
  const [delay, setDelay] = useState(() => delayManager.getDelay(proxyName, groupName));
  const [isJustUpdated, setIsJustUpdated] = useState(false);

  useEffect(() => {
    const listener = (newDelay: number) => {
      setDelay((currentDelay) => {
        if (newDelay >= 0 && newDelay !== currentDelay) {
          setIsJustUpdated(true);
          setTimeout(() => setIsJustUpdated(false), 600);
        }
        return newDelay;
      });
    };

    delayManager.setListener(proxyName, groupName, listener);
    return () => {
      delayManager.removeListener(proxyName, groupName);
    };
  }, [proxyName, groupName]);

  return (
    <SelectItem key={proxyName} value={proxyName}>
      <div className="flex items-center justify-between w-full">
        <span className="truncate">{proxyName}</span>
        <Badge
          variant={getDelayBadgeVariant(delay)}
          className={cn(
            "ml-4 flex-shrink-0 px-2 h-5 justify-center transition-colors duration-300",
            isJustUpdated && "bg-primary/20 border-primary/50"
          )}
        >
          {(delay < 0) || (delay > 10000) ? '---' : delay}
        </Badge>
      </div>
    </SelectItem>
  );
};


export const ProxySelectors: React.FC = () => {
  const { t } = useTranslation();
  const { verge } = useVerge();
  const { proxies, connections, clashConfig, refreshProxy } = useAppData();

  const mode = clashConfig?.mode?.toLowerCase() || 'rule';
  const isGlobalMode = mode === 'global';
  const isDirectMode = mode ==='direct';

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedProxy, setSelectedProxy] = useState<string>('');
  const [sortType, setSortType] = useState<ProxySortType>(() => (localStorage.getItem(STORAGE_KEY_SORT_TYPE) as ProxySortType) || 'default');

  useEffect(() => {
    if (!proxies?.groups) return;
    if (isGlobalMode) { setSelectedGroup('GLOBAL'); return; }
    if (isDirectMode) { setSelectedGroup('DIRECT'); return; }

    const savedGroup = localStorage.getItem(STORAGE_KEY_GROUP);
    const primaryGroup = proxies.groups.find((g: IProxyGroup) => g.type === 'Selector' && g.name.toLowerCase().includes('auto')) || proxies.groups.find((g: IProxyGroup) => g.type === 'Selector');

    if (savedGroup && proxies.groups.some((g: IProxyGroup) => g.name === savedGroup)) {
      setSelectedGroup(savedGroup);
    } else if (primaryGroup) {
      setSelectedGroup(primaryGroup.name);
    } else if (proxies.groups.length > 0) {
      const firstSelector = proxies.groups.find((g: IProxyGroup) => g.type === 'Selector');
      if (firstSelector) {
        setSelectedGroup(firstSelector.name);
      }
    }
  }, [proxies, isGlobalMode, isDirectMode]);

  useEffect(() => {
    if (!selectedGroup || !proxies) return;
    if (isGlobalMode) { setSelectedProxy(proxies.global?.now || ''); return; }
    if (isDirectMode) { setSelectedProxy('DIRECT'); return; }
    const group = proxies.groups.find((g: IProxyGroup) => g.name === selectedGroup);
    if (group) {
      const current = group.now;
      const firstInList = typeof group.all?.[0] === 'string' ? group.all[0] : group.all?.[0]?.name;
      setSelectedProxy(current || firstInList || '');
    }
  }, [selectedGroup, proxies, isGlobalMode, isDirectMode]);

  const handleProxyListOpen = useCallback((isOpen: boolean) => {
    if (!isOpen || isDirectMode) return;

    const timeout = verge?.default_latency_timeout || 5000;

    if (isGlobalMode) {
      const proxyList = proxies?.global?.all;
      if (proxyList) {
        const proxyNames = proxyList
          .map((p: any) => (typeof p === 'string' ? p : p.name))
          .filter((name: string) => name && !presetList.includes(name));

        delayManager.checkListDelay(proxyNames, 'GLOBAL', timeout);
      }
    } else {
      const group = proxies?.groups?.find((g: IProxyGroup) => g.name === selectedGroup);
      if (group && group.all) {
        const proxyNames = group.all.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
        delayManager.checkListDelay(proxyNames, selectedGroup, timeout);
      }
    }
  }, [selectedGroup, proxies, isGlobalMode, isDirectMode, verge]);

  const handleGroupChange = (newGroup: string) => {
    if (isGlobalMode || isDirectMode) return;
    setSelectedGroup(newGroup);
    localStorage.setItem(STORAGE_KEY_GROUP, newGroup);
  };

  const handleProxyChange = async (newProxy: string) => {
    if (newProxy === selectedProxy) return;
    const previousProxy = selectedProxy;
    setSelectedProxy(newProxy);
    try {
      await updateProxy(selectedGroup, newProxy);
      if (verge?.auto_close_connection && previousProxy) {
        connections?.data.forEach((conn: any) => {
          if (conn.chains.includes(previousProxy)) {
            deleteConnection(conn.id);
          }
        });
      }
      setTimeout(() => refreshProxy(), 300);
    } catch (error) {
      console.error("Failed to update proxy", error);
    }
  };

  const handleSortChange = () => {
    const nextSort: Record<ProxySortType, ProxySortType> = { default: 'delay', delay: 'name', name: 'default' };
    const newSortType = nextSort[sortType];
    setSortType(newSortType);
    localStorage.setItem(STORAGE_KEY_SORT_TYPE, newSortType);
  };

  const selectorGroups = useMemo(() => {
    if (!proxies?.groups) return [];

    const allowedTypes = ["Selector", "URLTest", "Fallback"];

    return proxies.groups.filter((g: IProxyGroup) =>
      allowedTypes.includes(g.type) &&
      !g.hidden
    );
  }, [proxies]);


  const proxyOptions = useMemo(() => {
    let options: { name: string }[] = [];
    if (isDirectMode) return [{ name: "DIRECT" }];

    const sourceList = isGlobalMode ? proxies?.global?.all : proxies?.groups?.find((g: IProxyGroup) => g.name === selectedGroup)?.all;

    if (sourceList) {
      options = sourceList.map((proxy: any) => ({
        name: typeof proxy === 'string' ? proxy : proxy.name,
      })).filter((p: { name: string }) => p.name);
    }

    if (sortType === 'name') return options.sort((a, b) => a.name.localeCompare(b.name));
    if (sortType === 'delay') {
      return options.sort((a, b) => {
        const delayA = delayManager.getDelay(a.name, selectedGroup);
        const delayB = delayManager.getDelay(b.name, selectedGroup);
        if (delayA < 0) return 1;
        if (delayB < 0) return -1;
        return delayA - delayB;
      });
    }
    return options;
  }, [selectedGroup, proxies, sortType, isGlobalMode, isDirectMode]);

  return (
    <TooltipProvider>
      <div className="flex justify-center flex-col gap-2 md:items-end">
        <div className="flex flex-col items-start gap-2">
          <label className="text-sm font-medium text-muted-foreground">{t("Group")}</label>
          <Select value={selectedGroup} onValueChange={handleGroupChange} disabled={isGlobalMode || isDirectMode}>
            <SelectTrigger className="w-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate">
                    <SelectValue placeholder={t("Select a group...")} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{selectedGroup}</p>
                </TooltipContent>
              </Tooltip>
            </SelectTrigger>
            <SelectContent>
              {selectorGroups.map((group: IProxyGroup) => (
                <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-start gap-2">
          <div className="flex justify-between items-center w-100">
            <label className="text-sm font-medium text-muted-foreground">{t("Proxy")}</label>
            <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate">
                    <Button variant="ghost" size="sm" onClick={handleSortChange} disabled={isDirectMode}>
                      {sortType === 'default' && <ChevronsUpDown className="h-4 w-4" />}
                      {sortType === 'delay' && <Timer className="h-4 w-4" />}
                      {sortType === 'name' && <WholeWord className="h-4 w-4" />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {sortType === 'default' && <p>{t("Sort by default")}</p>}
                  {sortType === 'delay' && <p>{t("Sort by delay")}</p>}
                  {sortType === 'name' && <p>{t("Sort by name")}</p>}
                </TooltipContent>
              </Tooltip>

          </div>
          <Select value={selectedProxy} onValueChange={handleProxyChange} disabled={isDirectMode} onOpenChange={handleProxyListOpen}>
            <SelectTrigger className="w-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate">
                    <SelectValue placeholder={t("Select a proxy...")} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{selectedProxy}</p>
                </TooltipContent>
              </Tooltip>
            </SelectTrigger>
            <SelectContent>
              {proxyOptions.map(proxy => (
                <ProxySelectItem
                    key={proxy.name}
                    proxyName={proxy.name}
                    groupName={selectedGroup}
                />
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </TooltipProvider>
  );
};
