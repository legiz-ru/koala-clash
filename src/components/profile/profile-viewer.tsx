import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { createProfile, patchProfile, importProfile } from "@/services/cmds";
import { useProfiles } from "@/hooks/use-profiles";
import { showNotice } from "@/services/noticeService";
import { version } from "@root/package.json";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {ClipboardPaste, Loader2, X} from "lucide-react";
import {readText} from "@tauri-apps/plugin-clipboard-manager";
import { cn } from "@root/lib/utils";


interface Props {
  onChange: (isActivating?: boolean) => void;
}

export interface ProfileViewerRef {
  create: () => void;
  edit: (item: IProfileItem) => void;
}

export const ProfileViewer = forwardRef<ProfileViewerRef, Props>((props, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [openType, setOpenType] = useState<"new" | "edit">("new");
  const { profiles } = useProfiles();
  const fileDataRef = useRef<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(true);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<IProfileItem>({
    defaultValues: {
      type: "remote",
      name: "",
      desc: "",
      url: "",
      option: {
        with_proxy: false,
        self_proxy: false,
        danger_accept_invalid_certs: false,
      },
    },
  });

  const { control, watch, handleSubmit, reset, setValue } = form;

  useImperativeHandle(ref, () => ({
    create: () => {
      reset({ type: "remote", name: "", desc: "", url: "", option: { with_proxy: false, self_proxy: false, danger_accept_invalid_certs: false } });
      fileDataRef.current = null;
      setImportUrl("");
      setShowAdvanced(false);
      setOpenType("new");
      setOpen(true);
    },
    edit: (item) => {
      reset(item);
      fileDataRef.current = null;
      setImportUrl(item.url || "");
      setShowAdvanced(true);
      setOpenType("edit");
      setOpen(true);
    },
  }));

  const selfProxy = watch("option.self_proxy");
  const withProxy = watch("option.with_proxy");
  useEffect(() => { if (selfProxy) setValue("option.with_proxy", false); }, [selfProxy, setValue]);
  useEffect(() => { if (withProxy) setValue("option.self_proxy", false); }, [withProxy, setValue]);

  useEffect(() => {
    if (!importUrl) {
      setIsUrlValid(true);
      setIsCheckingUrl(false);
      return;
    }
    setIsCheckingUrl(true);

    const handler = setTimeout(() => {
      try {
        new URL(importUrl);
        setIsUrlValid(true);
      } catch (error) {
        setIsUrlValid(false);
      } finally {
        setIsCheckingUrl(false);
      }
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [importUrl]);

  const handleImport = useLockFn(async () => {
    if (!importUrl) return;
    setIsImporting(true);
    try {
      await importProfile(importUrl);
      showNotice("success", t("Profile Imported Successfully"));
      props.onChange();
      setOpen(false);
    } catch (err) {
      showNotice("info", t("Import failed, retrying with Clash proxy..."));
      try {
        await importProfile(importUrl, { with_proxy: false, self_proxy: true });
        showNotice("success", t("Profile Imported with Clash proxy"));
        props.onChange();
        setOpen(false);
      } catch (retryErr: any) {
        showNotice("error", `${t("Import failed even with Clash proxy")}: ${retryErr?.message || retryErr.toString()}`);
      }
    } finally {
      setIsImporting(false);
    }
  });

  const onCopyLink = async () => {
    const text = await readText();
    if (text) setImportUrl(text);
  };

  const handleSaveAdvanced = useLockFn(
    handleSubmit(async (formData) => {
      const form = { ...formData, url: formData.url || importUrl };

      setLoading(true);
      try {
        if (!form.type) throw new Error("`Type` should not be null");
        if (form.type === "remote" && !form.url) throw new Error("The URL should not be null");
        if (form.option?.update_interval) form.option.update_interval = +form.option.update_interval;
        else delete form.option?.update_interval;
        if (form.option?.user_agent === "") delete form.option.user_agent;

        const name = form.name || `${form.type} file`;
        const item = { ...form, name };
        const isUpdate = openType === "edit";
        const isActivating = isUpdate && form.uid === (profiles?.current ?? "");

        if (openType === "new") {
          await createProfile(item, fileDataRef.current);
        } else {
          if (!form.uid) throw new Error("UID not found");
          await patchProfile(form.uid, item);
        }

        setOpen(false);
        props.onChange(isActivating);
      } catch (err: any) {
        showNotice("error", err.message || err.toString());
      } finally {
        setLoading(false);
      }
    }),
  );

  const formType = watch("type");
  const isRemote = formType === "remote";
  const isLocal = formType === "local";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{openType === "new" ? t("Create Profile") : t("Edit Profile")}</DialogTitle>
        </DialogHeader>

        {openType === "new" && (
           <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 flex-grow sm:flex-grow-0">
                <Input
                  type="text"
                  placeholder={t("Profile URL")}
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  disabled={isImporting}
                  className={cn(
                    "h-9 min-w-[200px] flex-grow sm:w-65",
                    !isUrlValid && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {importUrl ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("Clear")}
                    onClick={() => setImportUrl("")}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("Paste")}
                    onClick={onCopyLink}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                onClick={handleImport}
                disabled={!importUrl || isCheckingUrl || !isUrlValid || isImporting}
                className="flex-shrink-0 min-w-[5.5rem]"
              >
                {(isCheckingUrl || isImporting) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("Import")
                )}
              </Button>
              {!isUrlValid && importUrl && (
                <p className="text-sm text-destructive px-1">
                  {t("Please enter a valid URL")}
                </p>
              )}
            </div>

            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? t("Hide Advanced Settings") : t("Show Advanced Settings")}
            </Button>
          </div>
        )}


        {(openType === 'edit' || showAdvanced) && (
          <Form {...form}>
            <form onSubmit={e => { e.preventDefault(); handleSaveAdvanced(); }} className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pt-4">
              <FormField control={control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Type")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={openType === "edit"}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}/>

              <FormField control={control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input placeholder={t("Profile Name")} {...field} /></FormControl></FormItem>
              )}/>

              <FormField control={control} name="desc" render={({ field }) => (
                <FormItem><FormLabel>{t("Descriptions")}</FormLabel><FormControl><Input placeholder={t("Profile Description")} {...field} /></FormControl></FormItem>
              )}/>

              {isRemote && (
                 <FormField control={control} name="url" render={({ field }) => (
                    <FormItem><FormLabel>{t("Subscription URL")}</FormLabel><FormControl><Textarea placeholder={t("Leave blank to use the URL above")} {...field} /></FormControl></FormItem>
                 )}/>
              )}

              {isLocal && openType === "new" && (
                  <FormItem>
                      <FormLabel>{t("File")}</FormLabel>
                      <FormControl><Input type="file" accept=".yml,.yaml" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                              setValue("name", form.getValues("name") || file.name);
                              const reader = new FileReader();
                              reader.onload = (event) => { fileDataRef.current = event.target?.result as string; };
                              reader.readAsText(file);
                          }
                      }} /></FormControl>
                  </FormItem>
              )}

              {isRemote && (
                <div className="space-y-4 rounded-md border p-4">
                  <FormField control={control} name="option.update_interval" render={({ field }) => (
                    <FormItem><FormLabel>{t("Update Interval (mins)")}</FormLabel><FormControl><Input type="number" placeholder="1440" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl></FormItem>
                  )}/>
                  <FormField control={control} name="option.user_agent" render={({ field }) => (
                    <FormItem><FormLabel>User Agent</FormLabel><FormControl><Input placeholder={`clash-verge/v${version}`} {...field} /></FormControl></FormItem>
                  )}/>
                  <FormField control={control} name="option.with_proxy" render={({ field }) => (
                      <FormItem className="flex items-center justify-between"><FormLabel>{t("Use System Proxy")}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )}/>
                  <FormField control={control} name="option.self_proxy" render={({ field }) => (
                      <FormItem className="flex items-center justify-between"><FormLabel>{t("Use Clash Proxy")}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )}/>
                  <FormField control={control} name="option.danger_accept_invalid_certs" render={({ field }) => (
                      <FormItem className="flex items-center justify-between"><FormLabel className="text-destructive">{t("Accept Invalid Certs (Danger)")}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )}/>
                </div>
              )}

              <button type="submit" className="hidden" />
            </form>
          </Form>
        )}

        <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">{t("Cancel")}</Button></DialogClose>
            {(openType === 'edit' || showAdvanced) && (
              <Button type="button" onClick={handleSaveAdvanced} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("Save")}
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
