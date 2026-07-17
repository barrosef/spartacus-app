import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { MediaViewer } from "./MediaViewer";
import type { TimelineAttachment } from "./types";

/** Contexto de compartilhamento do visor: só a legenda de crédito. */
export interface ShareContext {
  caption: string;
}

interface MediaViewerContextValue {
  open: (
    images: TimelineAttachment[],
    index: number,
    share?: ShareContext,
  ) => void;
}

const MediaViewerContext = createContext<MediaViewerContextValue>({
  open: () => {},
});

export function useMediaViewer() {
  return useContext(MediaViewerContext);
}

/**
 * Hosts a SINGLE fullscreen media viewer at the app root. Galleries (which live
 * deep inside the timeline ScrollView) request it via `open()` instead of each
 * rendering its own <Modal>. A Modal nested inside a ScrollView hijacks the
 * scroll responder (freezing the feed) and renders blank — keeping exactly one
 * viewer above every ScrollView avoids that entirely.
 */
export function MediaViewerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<{
    images: TimelineAttachment[];
    index: number;
    share?: ShareContext;
  } | null>(null);

  const open = useCallback(
    (
      images: TimelineAttachment[],
      index: number,
      share?: ShareContext,
    ) => {
      setState({ images, index, share });
    },
    [],
  );
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <MediaViewerContext.Provider value={value}>
      {children}
      {state ? (
        <MediaViewer
          images={state.images}
          initialIndex={state.index}
          share={state.share}
          visible
          onClose={close}
        />
      ) : null}
    </MediaViewerContext.Provider>
  );
}
