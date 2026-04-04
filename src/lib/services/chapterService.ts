import { supabase } from "@/lib/supabase";

export interface ManhwaChapter {
  id: string;
  chapter_number: number;
  title: string;
  external_url: string | null;
  unlocked: boolean;
}

const CHAPTER_URL_MAP: Record<number, string> = {
  0: "https://comix.to/title/emqg8-solo-leveling/6673409-chapter-0",
  1: "https://comix.to/title/emqg8-solo-leveling/6673471-chapter-1",
};

export async function getUserChapters(userId: string, userLevel: number): Promise<ManhwaChapter[]> {
  if (!userId || userId === "local-user") return [];
  const chapters: ManhwaChapter[] = [];
  const maxVisibleChapter = Math.min(199, userLevel + 4);

  for (let i = 0; i <= maxVisibleChapter; i++) {
    chapters.push({
      id: i.toString(),
      chapter_number: i,
      title: `Chapter ${i}`,
      external_url: CHAPTER_URL_MAP[i] || `https://comix.to/title/emqg8-solo-leveling/chapter-${i}`,
      unlocked: i < userLevel
    });
  }
  return chapters;
}

export async function unlockNextChapter(userId: string, currentLevel: number) {
  if (!userId || userId === "local-user") return { success: false };
  return { success: true, chapterNumber: currentLevel };
}

export function getChapterUrl(chapterNumber: number): string {
  return CHAPTER_URL_MAP[chapterNumber] || `https://comix.to/title/emqg8-solo-leveling/chapter-${chapterNumber}`;
}

export async function getNextLockedChapter(userId: string, userLevel: number): Promise<ManhwaChapter | null> {
  if (!userId || userId === "local-user") return null;
  const chapters = await getUserChapters(userId, userLevel);
  return chapters.find(c => !c.unlocked) || null;
}
