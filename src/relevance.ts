import { extractContextInfo } from "./po.js";
import type { POFile, POItem } from "./po.js";
import type { ContextInfo, TranslationSample } from "./types.js";

function getWordOverlapCount(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  const leftWords = new Set(left.toLowerCase().split(/\s+/).filter(Boolean));
  const rightWords = new Set(right.toLowerCase().split(/\s+/).filter(Boolean));
  let overlap = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) {
      overlap += 1;
    }
  }

  return overlap;
}

function getDirectoryPath(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash === -1 ? "" : normalized.slice(0, lastSlash);
}

export function calculateRelevanceScore(
  item: POItem,
  currentItem: POItem,
  currentContext: ContextInfo,
): number {
  let score = 0;
  const itemContext = extractContextInfo(item);

  const pageOverlap = [...currentContext.pages].filter((page) => itemContext.pages.has(page)).length;
  if (pageOverlap > 0) {
    score += pageOverlap * 10;
  }

  const componentOverlap = [...currentContext.components].filter((component) =>
    itemContext.components.has(component),
  ).length;
  if (componentOverlap > 0) {
    score += componentOverlap * 8;
  }

  for (const currentOccurrence of currentContext.occurrences) {
    for (const itemOccurrence of itemContext.occurrences) {
      const currentDir = getDirectoryPath(currentOccurrence);
      const itemDir = getDirectoryPath(itemOccurrence);

      if (currentDir && currentDir === itemDir) {
        score += 5;
      } else if (
        currentDir &&
        itemDir &&
        (currentDir.startsWith(itemDir) || itemDir.startsWith(currentDir))
      ) {
        score += 3;
      }
    }
  }

  score += getWordOverlapCount(currentContext.comments, itemContext.comments);

  const currentHasPlaceholders = currentItem.msgid.includes("{") || currentItem.msgid.includes("%");
  const itemTranslation = item.msgstr[0] ?? "";

  if (itemTranslation.length > 20) {
    score += 2;
  } else if (itemTranslation.length > 5) {
    score += 1;
  }

  if (!itemTranslation.includes("{") && !itemTranslation.includes("%") && !currentHasPlaceholders) {
    score += 1;
  }

  return score;
}

export function getRelevantSampleTranslations(
  po: POFile,
  currentItem: POItem,
  targetCount = 10,
): TranslationSample[] {
  const currentContext = extractContextInfo(currentItem);
  const translatedItems = po.items.filter((item) => {
    if (item.obsolete || !item.msgid) {
      return false;
    }

    return item.msgstr.some((value) => value.trim() !== "");
  });

  return translatedItems
    .map((item) => ({
      item,
      score: calculateRelevanceScore(item, currentItem, currentContext),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, targetCount)
    .map(({ item }) => ({
      original: item.msgid,
      translation: item.msgstr[0] ?? "",
    }));
}
