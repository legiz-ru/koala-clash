// ProxyItemMini.tsx

import { useEffect, useState } from "react";
import { useLockFn } from "ahooks";
import { useVerge } from "@/hooks/use-verge";
import delayManager from "@/services/delay";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { BaseLoading } from "@/components/base";
import { Badge } from "@/components/ui/badge";
import { cn } from "@root/lib/utils";

interface Props {
  group: IProxyGroupItem;
  proxy: IProxyItem;
  selected: boolean;
  showType?: boolean;
  onClick?: (name: string) => void;
}

const getDelayColorClass = (delay: number): string => {
  if (delay < 0 || delay >= 10000) return "text-destructive";
  if (delay >= 500) return "text-destructive";
  if (delay >= 200) return "text-yellow-500";
  return "text-green-500";
};

export const ProxyItemMini = (props: Props) => {
  const { group, proxy, selected, showType = true, onClick } = props;
  const { t } = useTranslation();

  const presetList = ["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"];
  const isPreset = presetList.includes(proxy.name);

  const [delay, setDelay] = useState(-1);
  const { verge } = useVerge();
  const timeout = verge?.default_latency_timeout || 10000;

  useEffect(() => {
    if (isPreset) return;
    delayManager.setListener(proxy.name, group.name, setDelay);
    return () => delayManager.removeListener(proxy.name, group.name);
  }, [proxy.name, group.name, isPreset]);

  useEffect(() => {
    if (!proxy) return;
    setDelay(delayManager.getDelayFix(proxy, group.name));
  }, [proxy, group.name]);

  const onDelay = useLockFn(async () => {
    setDelay(-2);
    setDelay(await delayManager.checkDelay(proxy.name, group.name, timeout));
  });

  const handleItemClick = () => onClick?.(proxy.name);

  const handleDelayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!proxy.provider) onDelay();
  };

  return (
    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    // Увеличиваем высоту (h-16) и внутренние отступы (p-3)
    <div
      data-selected={selected}
      onClick={handleItemClick}
      title={`${proxy.name}\n${proxy.now ?? ""}`}
      className="group relative flex h-16 cursor-pointer items-center justify-between rounded-lg border border-transparent bg-card p-3 transition-all duration-200 data-[selected=true]:border-primary data-[selected=true]:bg-accent"
    >
      {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{proxy.name}</p>

        {showType && (
          <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden">
            {proxy.now && (
              <span className="truncate text-xs text-muted-foreground">
                {proxy.now}
              </span>
            )}
            {!!proxy.provider && (
              <Badge variant="outline" className="flex-shrink-0">
                {proxy.provider}
              </Badge>
            )}
            <Badge variant="outline" className="flex-shrink-0">
              {proxy.type}
            </Badge>
            {proxy.udp && (
              <Badge variant="outline" className="flex-shrink-0">
                UDP
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="ml-2 flex h-6 w-14 items-center justify-end text-sm">
        {isPreset ? null : delay === -2 ? (
          <div className="flex items-center text-muted-foreground">
            <BaseLoading className="h-4 w-4" />
          </div>
        ) : delay > 0 ? (
          <div
            onClick={handleDelayClick}
            className={`font-medium ${getDelayColorClass(delay)} ${!proxy.provider ? "hover:opacity-70" : "cursor-default"}`}
          >
            {delayManager.formatDelay(delay, timeout)}
          </div>
        ) : (
          <>
            {selected && (
              <CheckCircle2 className="h-5 w-5 text-primary group-hover:hidden" />
            )}
            {!selected && !proxy.provider && (
              <div
                onClick={handleDelayClick}
                className="hidden h-full w-full items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 group-hover:flex"
              >
                <RefreshCw className="h-4 w-4" />
              </div>
            )}
          </>
        )}
      </div>

      {group.fixed === proxy.name && (
        <span
          className={cn("absolute -top-1 -right-1 text-base", {
            grayscale: proxy.name !== group.now,
          })}
          title={
            group.type === "URLTest" ? t("Delay check to cancel fixed") : ""
          }
        >
          📌
        </span>
      )}
    </div>
  );
};
