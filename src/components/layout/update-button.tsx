import useSWR from "swr";
import { useRef } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { UpdateViewer } from "../setting/mods/update-viewer";
import { DialogRef } from "../base";
import { useVerge } from "@/hooks/use-verge";
import { Button } from "@/components/ui/button";
import { t } from "i18next";
import {Download, RefreshCw} from "lucide-react";
import { useSidebar } from "../ui/sidebar";

interface Props {
  className?: string;
}

export const UpdateButton = (props: Props) => {
  const { className } = props;
  const { verge } = useVerge();
  const { auto_check_update } = verge || {};
   const { state: sidebarState } = useSidebar();

  const viewerRef = useRef<DialogRef>(null);

  const { data: updateInfo } = useSWR(
    auto_check_update || auto_check_update === null ? "checkUpdate" : null,
    check,
    {
      errorRetryCount: 2,
      revalidateIfStale: false,
      focusThrottleInterval: 36e5, // 1 hour
    },
  );

  if (!updateInfo?.available) return null;

  return (
    <>
      <UpdateViewer ref={viewerRef} />
      {sidebarState === 'collapsed' ? (
        <Button
          variant="outline"
          size="icon"
          className={className}
          onClick={() => viewerRef.current?.open()}
        >
          <Download />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="lg"
          className={className}
          onClick={() => viewerRef.current?.open()}
        >
          <Download />
          {t("New update")}
        </Button>
      )}
    </>
  );
};
