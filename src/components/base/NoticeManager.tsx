"use client";

import { Toaster, toast } from "sonner";
import { useEffect, useSyncExternalStore } from "react";
import {
  getSnapshotNotices,
  hideNotice,
  subscribeNotices,
} from "@/services/noticeService";

export const NoticeManager = () => {
  const currentNotices = useSyncExternalStore(
    subscribeNotices,
    getSnapshotNotices,
  );

  useEffect(() => {
    for (const notice of currentNotices) {
      const toastId = toast(notice.message, {
        id: notice.id,
        duration: notice.duration,
        onDismiss: (t) => {
          hideNotice(t.id as number);
        },
      });
    }
  }, [currentNotices]);

  return <Toaster />;
};
