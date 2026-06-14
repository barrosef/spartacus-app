import React from "react";
import { PostCard } from "./PostCard";
import { AttendanceCard } from "./AttendanceCard";
import { DonationCard } from "./DonationCard";
import { AccountCard } from "./AccountCard";
import type { TimelineEntry } from "./types";

interface TimelineCardProps {
  entry: TimelineEntry;
  isStaff: boolean;
  isTarget: boolean;
  isSocial?: boolean;
  onLike: (entryId: string) => void;
  onViewLikes: (entryId: string) => void;
  onConfirm: (entryId: string) => void;
  onAbsent: (entryId: string) => void;
  onRequestReview: (entryId: string) => void;
  onPin?: (entryId: string) => void;
}

export function TimelineCard({
  entry,
  isStaff,
  isTarget,
  isSocial = false,
  onLike,
  onViewLikes,
  onConfirm,
  onAbsent,
  onRequestReview,
  onPin,
}: TimelineCardProps) {
  switch (entry.type) {
    case "post":
    case "event":
    case "championship":
      return (
        <PostCard
          entry={entry}
          isSocial={isSocial}
          onLike={() => onLike(entry.id)}
          onViewLikes={() => onViewLikes(entry.id)}
          onPin={() => onPin?.(entry.id)}
        />
      );

    case "attendance":
      return (
        <AttendanceCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
        />
      );

    case "donation":
      return (
        <DonationCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
        />
      );

    case "account_created":
      return <AccountCard entry={entry} />;

    default:
      return null;
  }
}
