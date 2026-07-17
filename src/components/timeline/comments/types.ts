export interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  text: string;
  parentId?: string | null;
  mentions: string[];
  /** Display strings (nickname→name) of the mentions, for full-span highlight. */
  mentionDisplays: string[];
  createdAt: string;
  /** ISO timestamp da última edição pelo autor; ausente = nunca editado. */
  editedAt?: string | null;
  deleted: boolean;
  deletedBy?: string | null;
}

export interface CommentsPage {
  items: Comment[];
  nextCursor?: string | null;
}

export interface Mentionable {
  uid: string;
  display: string;
  subtitle?: string | null;
  photoUrl?: string | null;
  initials: string;
}
