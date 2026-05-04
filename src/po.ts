import fs from "node:fs/promises";
import path from "node:path";

import PO from "pofile";

import type { ContextInfo } from "./types.js";

export type POFile = PO;
export type POItem = InstanceType<typeof PO.Item>;

function isTranslationMissing(item: POItem): boolean {
  return item.msgstr.length === 0 || item.msgstr.every((value) => value.trim() === "");
}

export async function loadPoFile(filePath: string): Promise<POFile> {
  const raw = await fs.readFile(filePath, "utf8");
  return PO.parse(raw);
}

export async function savePoFile(po: POFile, filePath: string): Promise<void> {
  po.headers["PO-Revision-Date"] = formatPoTimestamp(new Date());
  po.headers["Last-Translator"] = "Translation Bot <bot@example.com>";
  await fs.writeFile(filePath, po.toString(), "utf8");
}

export async function findLanguageDirectories(localesDir: string): Promise<string[]> {
  const dirEntries = await fs.readdir(localesDir, { withFileTypes: true });
  const languageDirs: string[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(localesDir, entry.name, "messages.po");
    try {
      await fs.access(candidate);
      languageDirs.push(path.join(localesDir, entry.name));
    } catch {
      // Ignore directories without a messages.po file.
    }
  }

  return languageDirs.sort((left, right) => left.localeCompare(right));
}

export function findMissingTranslations(po: POFile): POItem[] {
  return po.items.filter((item) => !item.obsolete && item.msgid && isTranslationMissing(item));
}

export function getTranslatedItems(po: POFile): POItem[] {
  return po.items.filter(
    (item) => !item.obsolete && Boolean(item.msgid) && !isTranslationMissing(item),
  );
}

export function getLanguageCode(languageDir: string): string {
  return path.basename(languageDir);
}

export function getCommentText(item: POItem): string {
  return [...item.comments, ...item.extractedComments].join(" ").trim();
}

export function getOccurrences(item: POItem): string[] {
  return item.references.map((reference) => reference.replace(/:\d+$/, ""));
}

export function setItemTranslation(item: POItem, translation: string): void {
  if (item.msgstr.length === 0) {
    item.msgstr = [translation];
    return;
  }

  item.msgstr[0] = translation;
}

export function extractContextInfo(item: POItem): ContextInfo {
  const occurrences = getOccurrences(item);
  const pages = new Set<string>();
  const components = new Set<string>();

  for (const occurrence of occurrences) {
    const normalized = occurrence.replaceAll("\\", "/");

    if (normalized.includes("/pages/")) {
      const pageParts = normalized.split("/pages/")[1]?.split("/").filter(Boolean) ?? [];
      if (pageParts.length > 0) {
        const firstPagePart = pageParts[0];
        if (firstPagePart) {
          pages.add(firstPagePart);
        }
      }
      if (pageParts.length > 1) {
        const firstPagePart = pageParts[0];
        const secondPagePart = pageParts[1];
        if (firstPagePart && secondPagePart) {
          pages.add(`${firstPagePart}/${secondPagePart}`);
        }
      }
    }

    if (normalized.includes("/components/")) {
      const componentParts = normalized
        .split("/components/")[1]
        ?.split("/")
        .filter(Boolean) ?? [];
      if (componentParts.length > 0) {
        const firstComponentPart = componentParts[0];
        if (firstComponentPart) {
          components.add(firstComponentPart);
        }
      }
    }
  }

  return {
    occurrences,
    comments: getCommentText(item),
    pages,
    components,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function getTimezoneOffsetParts(date: Date): { sign: string; hours: string; minutes: string } {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = pad(Math.floor(absoluteMinutes / 60));
  const minutes = pad(absoluteMinutes % 60);
  return { sign, hours, minutes };
}

export function formatPoTimestamp(date: Date): string {
  const { sign, hours, minutes } = getTimezoneOffsetParts(date);
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    sign,
    hours,
    minutes,
  ].join("");
}
