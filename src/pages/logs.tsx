// LogPage.tsx

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "foxact/use-local-storage";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Trash2, Menu } from "lucide-react";
import { LogLevel } from "@/hooks/use-log-data";
import { useClashInfo } from "@/hooks/use-clash";
import { useEnableLog } from "@/services/states";
import { BaseEmpty } from "@/components/base/base-empty";
import LogItem from "@/components/log/log-item";
import { BaseSearchBox } from "@/components/base/base-search-box";
import { SearchState } from "@/components/base/base-search-box";
import {
  useGlobalLogData,
  clearGlobalLogs,
  changeLogLevel,
  toggleLogEnabled,
} from "@/services/global-log-service";
import { cn } from "@root/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LogPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [enableLog, setEnableLog] = useEnableLog();
  const { clashInfo } = useClashInfo();
  const [logLevel, setLogLevel] = useLocalStorage<LogLevel>(
    "log:log-level",
    "info",
  );
  const [match, setMatch] = useState(() => (_: string) => true);
  const logData = useGlobalLogData(logLevel);
  const [searchState, setSearchState] = useState<SearchState>();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      if (scrollContainer) setIsScrolled(scrollContainer.scrollTop > 5);
    };
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const filterLogs = useMemo(() => {
    return logData
      ? logData.filter((data) => {
          const searchText =
            `${data.time || ""} ${data.type} ${data.payload}`.toLowerCase();
          return logLevel === "all"
            ? match(searchText)
            : data.type.toLowerCase() === logLevel && match(searchText);
        })
      : [];
  }, [logData, logLevel, match]);

  const handleLogLevelChange = (newLevel: LogLevel) => {
    setLogLevel(newLevel);
    if (clashInfo) {
      const { server = "", secret = "" } = clashInfo;
      changeLogLevel(newLevel, server, secret);
    }
  };

  const handleToggleLog = () => {
    if (clashInfo) {
      const { server = "", secret = "" } = clashInfo;
      toggleLogEnabled(server, secret);
      setEnableLog(!enableLog);
    }
  };

  const handleSearch = useCallback(
    (matcher: (content: string) => boolean, state: SearchState) => {
      setMatch(() => matcher);
      setSearchState(state);
    },
    [],
  );

  const menuItems = [
    { label: t("Home"), path: "/home" },
    { label: t("Profiles"), path: "/profile" },
    { label: t("Settings"), path: "/settings" },
    { label: t("Proxies"), path: "/proxies" },
    { label: t("Connections"), path: "/connections" },
    { label: t("Rules"), path: "/rules" },
  ];

  return (
    <div className="h-full w-full relative">
      {/* "Липкая" шапка */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-10 p-4 transition-all duration-200",
          // --- НАЧАЛО ИЗМЕНЕНИЙ ---
          // Вместо блюра делаем солидный фон с тенью при прокрутке
          { "bg-background shadow-md": isScrolled },
          // --- КОНЕЦ ИЗМЕНЕНИЙ ---
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">{t("Logs")}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title={t(enableLog ? "Pause" : "Resume")}
              onClick={handleToggleLog}
            >
              {enableLog ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            {enableLog && (
              <Button size="sm" variant="outline" onClick={clearGlobalLogs}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("Clear")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title={t("Menu")}>
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("Menu")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onSelect={() => navigate(item.path)}
                    disabled={location.pathname === item.path}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={logLevel} onValueChange={handleLogLevelChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("Log Level")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL</SelectItem>
              <SelectItem value="info">INFO</SelectItem>
              <SelectItem value="warning">WARNING</SelectItem>
              <SelectItem value="error">ERROR</SelectItem>
              <SelectItem value="debug">DEBUG</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-grow">
            <BaseSearchBox onSearch={handleSearch} />
          </div>
        </div>
      </div>

      {/* Возвращаем Virtuoso на место */}
      <div
        ref={scrollContainerRef}
        className="absolute top-0 left-0 right-0 bottom-0 pt-32 overflow-y-auto"
      >
        {filterLogs.length > 0 ? (
          <Virtuoso
            data={filterLogs}
            itemContent={(index, item) => (
              <LogItem value={item} searchState={searchState} />
            )}
            followOutput={"smooth"}
            className="w-full h-full"
          />
        ) : (
          <BaseEmpty />
        )}
      </div>
    </div>
  );
};

export default LogPage;
