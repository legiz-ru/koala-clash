import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useAppData } from "@/providers/app-data-provider";
import { useVisibility } from "@/hooks/use-visibility";
import { cn } from "@root/lib/utils";

// Компоненты
import { BaseEmpty } from "@/components/base";
import RuleItem from "@/components/rule/rule-item";
import { ProviderButton } from "@/components/rule/provider-button";
import { BaseSearchBox, SearchState } from "@/components/base/base-search-box";
import { ScrollTopButton } from "@/components/layout/scroll-top-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Иконки
import { Menu } from "lucide-react";

const RulesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rules = [], refreshRules, refreshRuleProviders } = useAppData();
  const [match, setMatch] = useState(() => (_: string) => true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pageVisible = useVisibility();

  // --- НАЧАЛО ИЗМЕНЕНИЙ 1 ---
  // Разделяем логику на два безопасных useEffect
  useEffect(() => {
    // Этот эффект сработает только один раз при монтировании компонента
    refreshRules();
    refreshRuleProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей = запуск только один раз

  useEffect(() => {
    // Этот эффект будет срабатывать только при изменении видимости страницы
    if (pageVisible) {
      refreshRules();
      refreshRuleProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageVisible]);
  // --- КОНЕЦ ИЗМЕНЕНИЙ 1 ---

  const filteredRules = useMemo(() => {
    return rules.filter((item) => match(item.payload));
  }, [rules, match]);

  useEffect(() => {
    const currentScroller = scrollerRef.current;
    if (!currentScroller) return;
    const handleScroll = () => {
      const scrollTop = currentScroller.scrollTop;
      setIsScrolled(scrollTop > 5);
      setShowScrollTop(scrollTop > 100);
    };
    currentScroller.addEventListener("scroll", handleScroll);
    return () => currentScroller.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    virtuosoRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // --- НАЧАЛО ИЗМЕНЕНИЙ 2 ---
  // Оборачиваем обработчик поиска в useCallback для стабильности
  const handleSearch = useCallback((matcher: (content: string) => boolean) => {
    setMatch(() => matcher);
  }, []);
  // --- КОНЕЦ ИЗМЕНЕНИЙ 2 ---

  const menuItems = [
    { label: t("Home"), path: "/home" },
    { label: t("Profiles"), path: "/profile" },
    { label: t("Settings"), path: "/settings" },
    { label: t("Logs"), path: "/logs" },
    { label: t("Proxies"), path: "/proxies" },
    { label: t("Connections"), path: "/connections" },
  ];

  return (
    <div className="h-full w-full relative">
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-10 p-4 transition-all duration-200",
          { "bg-background/80 backdrop-blur-sm shadow-sm": isScrolled },
        )}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("Rules")}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-70">
              {/* Передаем стабильную функцию handleSearch в пропс */}
              <BaseSearchBox onSearch={handleSearch} />
            </div>
            <ProviderButton />
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
      </div>

      <div
        ref={scrollerRef}
        className="absolute top-0 left-0 right-0 bottom-0 pt-20 overflow-y-auto"
      >
        {filteredRules.length > 0 ? (
          <Virtuoso
            ref={virtuosoRef}
            data={filteredRules}
            className="h-full w-full"
            itemContent={(index, item) => (
              <RuleItem index={index + 1} value={item} />
            )}
          />
        ) : (
          <BaseEmpty />
        )}
      </div>

      <ScrollTopButton onClick={scrollToTop} show={showScrollTop} />
    </div>
  );
};

export default RulesPage;
