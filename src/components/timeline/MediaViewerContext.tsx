import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { MediaViewer } from "./MediaViewer";
import type { TimelineAttachment } from "./types";

interface MediaViewerContextValue {
  open: (images: TimelineAttachment[], index: number) => void;
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
  } | null>(null);

  const open = useCallback(
    (images: TimelineAttachment[], index: number) => {
      setState({ images, index });
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
          visible
          onClose={close}
        />
      ) : null}
    </MediaViewerContext.Provider>
  );
}
