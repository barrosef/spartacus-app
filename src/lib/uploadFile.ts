import { Platform } from "react-native";
import { api } from "./api";

export type AttachmentKind = "image" | "file" | "voice";

/** Shared `{ type, url, name, size }` shape returned by every backend
 * upload endpoint built on `storage_service.upload_media_attachment`
 * (`/posts/upload`, `/attendance/justification-upload`, ...). */
export interface UploadedAttachment {
  type: AttachmentKind;
  url: string;
  name: string;
  size: number;
}

/**
 * Generic multipart file upload. Extracted from `PostWizardScreen`'s
 * original `uploadFile` (which hardcoded `/posts/upload`) so any flow that
 * needs to upload a file — e.g. justification attachments — can reuse the
 * same web/native FormData handling against its own endpoint.
 *
 * Throws `ApiError` (see `./api`) on failure; callers own loading state and
 * error UI (dialog, etc).
 */
export async function uploadFile(
  endpoint: string,
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<UploadedAttachment> {
  const formData = new FormData();
  if (Platform.OS === "web") {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    (formData as unknown as globalThis.FormData).append(
      "file",
      blob,
      fileName,
    );
  } else {
    formData.append("file", {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }
  return api.upload<UploadedAttachment>(endpoint, formData);
}
