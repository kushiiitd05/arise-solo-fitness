export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'NATIONAL';
export type JobClass = 'FIGHTER' | 'MAGE' | 'ASSASSIN' | 'TANK' | 'HEALER' | 'NONE';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  hunter_rank: HunterRank;
  job_class: JobClass;
  level: number;
  current_xp: bigint;
  xp_to_next_level: bigint;
  title?: string;
}

export interface UserStats {
  user_id: string;
  strength: number;
  vitality: number;
  agility: number;
  intelligence: number;
  perception: number;
  sense: number;
  available_stat_points: number;
}
