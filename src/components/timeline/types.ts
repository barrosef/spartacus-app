export interface TimelineAttachment {
  type: string;
  url: string;
  name: string;
}

export interface TimelineLinkPreview {
  url: string;
  title: string;
  image: string;
  description: string;
}

export interface TimelineEntry {
  id: string;
  type:
    | "post"
    | "event"
    | "championship"
    | "attendance"
    | "donation"
    | "account_created";
  origin: string;
  authorUid: string;
  authorName: string;
  authorRoles: string[];
  authorPhotoUrl?: string | null;
  targetUid?: string | null;
  targetName?: string | null;
  targetPhotoUrl?: string | null;
  title?: string | null;
  description?: string | null;
  attachments?: TimelineAttachment[] | null;
  linkPreview?: TimelineLinkPreview | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  validationStatus?: "pending" | "confirmed" | "absent" | null;
  reviewRequested?: boolean;
  reviewResolved?: boolean;
  likesCount: number;
  commentsCount: number;
  userLiked: boolean;
  isPinned?: boolean;
  turmaName?: string | null;
  modalidadeName?: string | null;
  classDate?: string | null;
  donationAmount?: string | null;
  rolesLabel?: string | null;
  classes?: string[] | null;
  guardianName?: string | null;
  createdAt: string;
}

export type ValidationStatus = "pending" | "confirmed" | "absent" | null;
