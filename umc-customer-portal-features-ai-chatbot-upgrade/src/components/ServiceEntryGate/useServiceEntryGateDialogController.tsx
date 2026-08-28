import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ServiceEntryDangerConfirmModal from "./ServiceEntryDangerConfirmModal";
import ServiceEntryGateModal from "./ServiceEntryGateModal";
import ServiceEntryGateProfileListModal from "./ServiceEntryGateProfileListModal";
import ServiceEntryLicenseStatusModal from "./ServiceEntryLicenseStatusModal";
import type {
  ServiceEntryGateDialogConfig,
  ServiceEntryGateDialogOpener,
  ServiceEntryGateDialogResult,
} from "./types";

const resolveResult = (
  resolver: ((result: ServiceEntryGateDialogResult) => void) | null,
  result: ServiceEntryGateDialogResult,
) => {
  resolver?.(result);
};

export default function useServiceEntryGateDialogController(): {
  openDialog: ServiceEntryGateDialogOpener;
  dialogNode: ReactNode;
} {
  const [dialog, setDialog] = useState<ServiceEntryGateDialogConfig | null>(null);
  const resolverRef = useRef<
    ((result: ServiceEntryGateDialogResult) => void) | null
  >(null);
  const dismissActionKeyRef = useRef("back");

  const closeDialog = useCallback((result: ServiceEntryGateDialogResult) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    dismissActionKeyRef.current = "back";
    setDialog(null);
    resolveResult(resolver, result);
  }, []);

  const openDialog = useCallback<ServiceEntryGateDialogOpener>((nextDialog) => {
    const previousResolver = resolverRef.current;
    const previousDismissActionKey = dismissActionKeyRef.current;

    resolverRef.current = null;
    dismissActionKeyRef.current = nextDialog.dismissActionKey || "back";
    setDialog(nextDialog);

    if (previousResolver) {
      resolveResult(previousResolver, {
        actionKey: previousDismissActionKey || "back",
      });
    }

    return new Promise<ServiceEntryGateDialogResult>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    return () => {
      const resolver = resolverRef.current;
      resolverRef.current = null;
      if (resolver) {
        resolveResult(resolver, {
          actionKey: dismissActionKeyRef.current || "back",
        });
      }
    };
  }, []);

  const dialogNode = useMemo(() => {
    if (!dialog) {
      return null;
    }

    const handleClose = () => {
      closeDialog({
        actionKey: dialog.dismissActionKey || "back",
      });
    };

    switch (dialog.kind) {
      case "profile-list":
        return (
          <ServiceEntryGateProfileListModal
            visible
            dialog={dialog}
            onClose={handleClose}
            onAction={(actionKey, selectedProfileId) =>
              closeDialog({ actionKey, selectedProfileId })
            }
          />
        );
      case "license-status":
        return (
          <ServiceEntryLicenseStatusModal
            visible
            dialog={dialog}
            onClose={handleClose}
            onAction={(actionKey) => closeDialog({ actionKey })}
          />
        );
      case "danger-confirm":
        return (
          <ServiceEntryDangerConfirmModal
            visible
            dialog={dialog}
            onClose={handleClose}
            onAction={(actionKey) => closeDialog({ actionKey })}
          />
        );
      case "message":
      default:
        return (
          <ServiceEntryGateModal
            visible
            dialog={dialog}
            onClose={handleClose}
            onAction={(actionKey) => closeDialog({ actionKey })}
          />
        );
    }
  }, [closeDialog, dialog]);

  return {
    openDialog,
    dialogNode,
  };
}
