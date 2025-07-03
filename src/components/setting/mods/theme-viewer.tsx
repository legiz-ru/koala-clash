import { forwardRef, useImperativeHandle, useState, useMemo } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles"; // Оставляем для получения дефолтных цветов темы

// Новые импорты
import { useVerge } from "@/hooks/use-verge";
import { defaultTheme, defaultDarkTheme } from "@/pages/_theme";
import { DialogRef } from "@/components/base";
import { EditorViewer } from "@/components/profile/editor-viewer";
import { showNotice } from "@/services/noticeService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";

interface Props {}

// Дочерний компонент для одной строки настройки цвета
const ColorSettingRow = ({ label, value, placeholder, onChange }: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="flex items-center justify-between">
    <Label>{label}</Label>
    <div className="flex items-center gap-2">
      {/* --- НАЧАЛО ИЗМЕНЕНИЙ --- */}
      {/* Этот контейнер теперь позиционирован, чтобы спрятать input внутри */}
      <div className="relative h-6 w-6 cursor-pointer">
        {/* Видимый образец цвета */}
        <div
          className="h-full w-full rounded-full border"
          style={{ backgroundColor: value || placeholder }}
        />
        {/* Невидимый input, который и открывает палитру */}
        <Input
          type="color"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={value || placeholder}
          onChange={onChange}
        />
      </div>
      {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}
      <Input
        className="w-32 h-8 font-mono text-sm"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  </div>
);

export const ThemeViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { verge, patchVerge } = useVerge();
  const { theme_setting } = verge ?? {};
  const [theme, setTheme] = useState(theme_setting || {});

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true);
      setTheme({ ...theme_setting });
    },
    close: () => setOpen(false),
  }));

  const handleChange = (field: keyof typeof theme) => (e: any) => {
    setTheme((t) => ({ ...t, [field]: e.target.value }));
  };

  const onSave = useLockFn(async () => {
    try {
      await patchVerge({ theme_setting: theme });
      setOpen(false);
      showNotice("success", t("Saved Successfully, please restart the app to take effect"));
    } catch (err: any) {
      showNotice("error", err.toString());
    }
  });

  const muiTheme = useTheme();
  const dt = muiTheme.palette.mode === "light" ? defaultTheme : defaultDarkTheme;
  type ThemeKey = keyof typeof theme & keyof typeof defaultTheme;

  const renderItem = (label: string, key: ThemeKey) => {
    return (
      <ColorSettingRow
        label={label}
        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        // Добавляем `?? ''` чтобы value всегда был строкой
        value={theme[key] ?? ""}
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
        placeholder={dt[key]}
        onChange={handleChange(key)}
      />
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Theme Setting")}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto space-y-3 p-1">
            {renderItem(t("Primary Color"), "primary_color")}
            {renderItem(t("Secondary Color"), "secondary_color")}
            {renderItem(t("Primary Text"), "primary_text")}
            {renderItem(t("Secondary Text"), "secondary_text")}
            {renderItem(t("Info Color"), "info_color")}
            {renderItem(t("Warning Color"), "warning_color")}
            {renderItem(t("Error Color"), "error_color")}
            {renderItem(t("Success Color"), "success_color")}

            <div className="flex items-center justify-between py-2">
              <Label>{t("Font Family")}</Label>
              <Input
                  className="w-48 h-8"
                  // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                  value={theme.font_family ?? ""}
                  // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                  onChange={handleChange("font_family")}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>{t("CSS Injection")}</Label>
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />{t("Edit")} CSS
              </Button>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">{t("Cancel")}</Button></DialogClose>
            <Button type="button" onClick={onSave}>{t("Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editorOpen && (
        <EditorViewer
          open={true}
          title={`${t("Edit")} CSS`}
          initialData={Promise.resolve(theme.css_injection ?? "")}
          language="css"
          onSave={(_prev, curr) => {
            setTheme(v => ({ ...v, css_injection: curr }));
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
});
