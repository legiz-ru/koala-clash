// SettingPage.tsx

import React, { useState, useRef, useEffect } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { openWebUrl } from "@/services/cmds";
import SettingVergeBasic from "@/components/setting/setting-verge-basic";
import SettingVergeAdvanced from "@/components/setting/setting-verge-advanced";
import SettingClash from "@/components/setting/setting-clash";
import SettingSystem from "@/components/setting/setting-system";
import { showNotice } from "@/services/noticeService";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// Убираем CardHeader и CardTitle из импортов
import { Card, CardContent } from "@/components/ui/card";
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Github, HelpCircle, Send } from "lucide-react";
import { cn } from "@root/lib/utils";

const SettingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      if (scrollContainer) {
        setIsScrolled(scrollContainer.scrollTop > 10);
      }
    };
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const onError = (err: any) =>
    showNotice("error", err?.message || err.toString());
  const toGithubRepo = useLockFn(() =>
    openWebUrl("https://github.com/clash-verge-rev/clash-verge-rev"),
  );
  const toGithubDoc = useLockFn(() =>
    openWebUrl("https://clash-verge-rev.github.io/index.html"),
  );
  const toTelegramChannel = useLockFn(() =>
    openWebUrl("https://t.me/clash_verge_re"),
  );
  const menuItems = [
    { label: t("Home"), path: "/home" },
    { label: t("Profiles"), path: "/profile" },
    { label: t("Logs"), path: "/logs" },
    { label: t("Proxies"), path: "/proxies" },
    { label: t("Connections"), path: "/connections" },
    { label: t("Rules"), path: "/rules" },
  ];

  return (
    <div className="h-full w-full relative">
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center transition-colors duration-200",
          { "bg-background/80 backdrop-blur-sm": isScrolled },
        )}
      >
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("Settings")}
        </h2>
        <div className="flex items-center gap-2">
          {/* ...кнопки... */}
          <Button
            variant="ghost"
            size="icon"
            title={t("Manual")}
            onClick={toGithubDoc}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t("TG Channel")}
            onClick={toTelegramChannel}
          >
            <Send className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={t("Github Repo")}
            onClick={toGithubRepo}
          >
            <Github className="h-5 w-5" />
          </Button>
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

      <div
        ref={scrollContainerRef}
        className="absolute top-0 left-0 right-0 bottom-0 pt-20 overflow-y-auto"
      >
        <div className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* --- НАЧАЛО ИЗМЕНЕНИЙ --- */}

            {/* Column 1 */}
            <div className="space-y-4">
              <Card>
                <CardContent>
                  <SettingSystem onError={onError} />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <SettingClash onError={onError} />
                </CardContent>
              </Card>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <Card>
                <CardContent>
                  <SettingVergeBasic onError={onError} />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <SettingVergeAdvanced onError={onError} />
                </CardContent>
              </Card>
            </div>

            {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;
