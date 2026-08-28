import { useCallback, useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  getLayoutScrollContainer,
  restoreScrollPosition,
  saveScrollPosition,
} from "./scrollRestoration";
import useKeepAliveActivated from "./useKeepAliveActivated";

export default function useKeepAliveScrollRestoration() {
  const history = useHistory();
  const location = useLocation();
  const scrollPositionRef = useRef(0);
  const restoreFrameRef = useRef<number | null>(null);
  const restoreAfterPaintFrameRef = useRef<number | null>(null);
  const navigationPendingRef = useRef(false);
  const activeRef = useRef(false);
  const cancelPendingRestore = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
    if (restoreAfterPaintFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreAfterPaintFrameRef.current);
      restoreAfterPaintFrameRef.current = null;
    }
  }, []);

  const activated = useKeepAliveActivated({
    onActivated: () => {
      if (typeof window === "undefined") {
        return;
      }

      // This flag is set while the cached page leaves its route. Clear that
      // completed navigation before scheduling the return restoration.
      navigationPendingRef.current = false;
      cancelPendingRestore();

      restoreFrameRef.current = window.requestAnimationFrame(() => {
        restoreFrameRef.current = null;
        restoreAfterPaintFrameRef.current = window.requestAnimationFrame(() => {
          restoreAfterPaintFrameRef.current = null;
          if (!activeRef.current || navigationPendingRef.current) {
            return;
          }

          restoreScrollPosition(
            getLayoutScrollContainer(),
            scrollPositionRef.current,
          );
        });
      });
    },
    onDeactivated: () => {
      cancelPendingRestore();
      // Route navigation may reset the shared SimpleBar before passive effects run.
      // The active scroll listener holds the last user position in that case.
      scrollPositionRef.current = Math.max(
        scrollPositionRef.current,
        saveScrollPosition(getLayoutScrollContainer()),
      );
    },
  });

  activeRef.current = activated;

  useEffect(() => {
    if (!activated) {
      return;
    }

    navigationPendingRef.current = false;

    return history.listen((nextLocation) => {
      scrollPositionRef.current = saveScrollPosition(
        getLayoutScrollContainer(),
      );

      if (nextLocation.pathname !== location.pathname) {
        navigationPendingRef.current = true;
        cancelPendingRestore();
      }
    });
  }, [activated, cancelPendingRestore, history, location.pathname]);

  useEffect(() => {
    if (!activated) {
      return;
    }

    const scrollContainer = getLayoutScrollContainer();
    if (!scrollContainer) {
      return;
    }

    const captureScrollPosition = () => {
      if (!activeRef.current || navigationPendingRef.current) {
        return;
      }

      scrollPositionRef.current = saveScrollPosition(scrollContainer);
    };

    if (scrollPositionRef.current === 0) {
      captureScrollPosition();
    }
    scrollContainer.addEventListener("scroll", captureScrollPosition);

    return () => {
      scrollContainer.removeEventListener("scroll", captureScrollPosition);
    };
  }, [activated]);

  useEffect(
    () => () => cancelPendingRestore(),
    [cancelPendingRestore],
  );
}
