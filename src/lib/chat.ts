import { mediaUrl } from "./storage";

export const authorSelect = { id: true, handle: true, displayName: true, hue: true, avatarKey: true } as const;

export type ChatAuthor = { id: string; handle: string; displayName: string; hue: number; avatarUrl: string };

export const toAuthor = (u: { id: string; handle: string; displayName: string; hue: number; avatarKey: string }): ChatAuthor => ({
  id: u.id, handle: u.handle, displayName: u.displayName, hue: u.hue, avatarUrl: mediaUrl(u.avatarKey),
});

export type ChatMsg = { id: string; body: string; createdAt: string; author: ChatAuthor };
export type DirectMsg = { id: string; body: string; createdAt: string; mine: boolean };

/** Minimum gap between two messages from the same person, to keep chat usable. */
export const CHAT_GAP_MS = 1200;
export const DM_GAP_MS = 800;
