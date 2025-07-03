import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { createProfile, patchProfile } from "@/services/cmds";
import { useProfiles } from "@/hooks/use-profiles";
import { showNotice } from "@/services/noticeService";
import { version } from "@root/package.json";

// --- Новые импорты ---
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
import { Loader2 } from "lucide-react";


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
  const [loading, setLoading] = useState(false);
  const { profiles } = useProfiles();
  const fileDataRef = useRef<string | null>(null);

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
      setOpenType("new");
      setOpen(true);
    },
    edit: (item) => {
      reset(item);
      fileDataRef.current = null;
      setOpenType("edit");
      setOpen(true);
    },
  }));

  const selfProxy = watch("option.self_proxy");
  const withProxy = watch("option.with_proxy");

  useEffect(() => {
    if (selfProxy) setValue("option.with_proxy", false);
  }, [selfProxy, setValue]);

  useEffect(() => {
    if (withProxy) setValue("option.self_proxy", false);
  }, [withProxy, setValue]);

  const handleOk = useLockFn(
    handleSubmit(async (form) => {
      if (form.option?.timeout_seconds) {
        form.option.timeout_seconds = +form.option.timeout_seconds;
      }

      setLoading(true);
      try {
        if (!form.type) throw new Error("`Type` should not be null");
        if (form.type === "remote" && !form.url) {
          throw new Error("The URL should not be null");
        }

        if (form.option?.update_interval) {
          form.option.update_interval = +form.option.update_interval;
        } else {
          delete form.option?.update_interval;
        }
        if (form.option?.user_agent === "") {
          delete form.option.user_agent;
        }

        const name = form.name || `${form.type} file`;
        const item = { ...form, name };
        const isRemote = form.type === "remote";
        const isUpdate = openType === "edit";
        const isActivating = isUpdate && form.uid === (profiles?.current ?? "");
        const originalOptions = { with_proxy: form.option?.with_proxy, self_proxy: form.option?.self_proxy };

        if (!isRemote) {
          if (openType === "new") {
            await createProfile(item, fileDataRef.current);
          } else {
            if (!form.uid) throw new Error("UID not found");
            await patchProfile(form.uid, item);
          }
        } else {
          try {
            if (openType === "new") {
              await createProfile(item, fileDataRef.current);
            } else {
              if (!form.uid) throw new Error("UID not found");
              await patchProfile(form.uid, item);
            }
          } catch (err) {
            showNotice("info", t("Profile creation failed, retrying with Clash proxy..."));
            const retryItem = { ...item, option: { ...item.option, with_proxy: false, self_proxy: true } };
            if (openType === "new") {
              await createProfile(retryItem, fileDataRef.current);
            } else {
              if (!form.uid) throw new Error("UID not found");
              await patchProfile(form.uid, retryItem);
              await patchProfile(form.uid, { option: originalOptions });
            }
            showNotice("success", t("Profile creation succeeded with Clash proxy"));
          }
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{openType === "new" ? t("Create Profile") : t("Edit Profile")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={e => { e.preventDefault(); handleOk(); }} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <FormField control={control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Type")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Name")}</FormLabel>
                <FormControl><Input placeholder={t("Profile Name")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={control} name="desc" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Descriptions")}</FormLabel>
                <FormControl><Input placeholder={t("Profile Description")} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            {isRemote && (
              <>
                <FormField control={control} name="url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Subscription URL")}</FormLabel>
                    <FormControl><Textarea placeholder="https://example.com/profile.yaml" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="option.user_agent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Agent</FormLabel>
                    <FormControl><Input placeholder={`clash-verge/v${version}`} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={control} name="option.update_interval" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Update Interval")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="number" placeholder="1440" {...field} onChange={event => field.onChange(parseInt(event.target.value, 10) || 0)} />
                        <span className="text-sm text-muted-foreground">{t("mins")}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>
            )}

            {isLocal && openType === "new" && (
                <FormItem>
                    <FormLabel>{t("File")}</FormLabel>
                    <FormControl>
                        <Input type="file" accept=".yml,.yaml" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setValue("name", form.getValues("name") || file.name);
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    fileDataRef.current = event.target?.result as string;
                                };
                                reader.readAsText(file);
                            }
                        }} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}

            {isRemote && (
              <div className="space-y-4 rounded-md border p-4">
                  <FormField control={control} name="option.with_proxy" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                          <FormLabel>{t("Use System Proxy")}</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={control} name="option.self_proxy" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                          <FormLabel>{t("Use Clash Proxy")}</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
                  <FormField control={control} name="option.danger_accept_invalid_certs" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                          <FormLabel className="text-destructive">{t("Accept Invalid Certs (Danger)")}</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                  )}/>
              </div>
            )}

            <button type="submit" className="hidden" />
          </form>
        </Form>

        <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">{t("Cancel")}</Button></DialogClose>
            <Button type="button" onClick={handleOk} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("Save")}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
