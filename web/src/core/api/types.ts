/** Mirrors api/app/schemas.py — keep in sync when the backend contract changes. */

import type { Lang } from '@/core/i18n'

/** Public view of a person — the shape embedded as a post author, petitioner,
 *  raisi, leaderboard entry, etc. Deliberately has NO lang / tg_dm_enabled: those
 *  are private account settings and must not be broadcast to the whole feed. */
export interface User {
  id: number
  full_name: string
  username: string | null
  photo_url: string | null
  is_admin: boolean
  is_raisi: boolean
  mahalla_id: number | null
  household_id: number | null
  rep_month: number
  rep_alltime: number
  banned_until: string | null
}

/** The account's own view of itself (from /auth/me and self-mutations). Only ever
 *  the current user, so it may carry private settings the public User must not. */
export interface SelfUser extends User {
  /** Account language — what the backend writes Telegram DMs / reminders in. */
  lang: Lang
  /** Opt-out switch for Telegram direct messages (in-app notices keep coming). */
  tg_dm_enabled: boolean
}

export interface AuthConfig {
  dev: boolean
  telegram_bot: string | null
}

export interface AppNotification {
  id: number
  type: string
  text: string
  link: string | null
  read: boolean
  created_at: string
}

export interface Notifications {
  items: AppNotification[]
  unread: number
}

export interface Region {
  id: number
  name_uz: string
}

export interface District {
  id: number
  region_id: number
  name_uz: string
}

export type MahallaStatus = 'forming' | 'pending' | 'active' | 'rejected'

export interface Mahalla {
  id: number
  district_id: number
  name: string
  status: MahallaStatus
  estimated_households: number | null
  petition_count: number
  petition_threshold: number
  member_count: number
}

export interface LeaderboardEntry {
  user: User
  points: number
  rank: number
}

export interface MahallaDetail extends Mahalla {
  district_name: string
  region_name: string
  raisi: User | null
  faol_qoshni: LeaderboardEntry | null
  household_count: number
  activated_at: string | null
}

export interface PetitionStatus {
  mahalla: Mahalla
  my_petition: boolean
}

export interface Leaderboard {
  month: LeaderboardEntry[]
  alltime: LeaderboardEntry[]
  month_key: string
}

export interface Me {
  user: SelfUser
  mahalla: MahallaDetail | null
  petition: PetitionStatus | null
  household: Household | null
}

export interface HouseholdMember {
  id: number
  full_name: string
  is_elder: boolean
  user_id: number | null
}

export type HouseholdVisibility = 'neighbors' | 'family_only'

export interface Household {
  id: number
  mahalla_id: number
  family_name: string
  resident_count: number
  street: string | null
  family_history: string | null
  generations_here: number | null
  visibility: HouseholdVisibility
  verification_status: 'pending' | 'verified'
  vouch_count: number
  my_vouch: boolean
  has_location: boolean
  members: HouseholdMember[]
  photos: HouseholdPhoto[]
  created_by: number
  created_at: string
}

export interface HouseholdPhoto {
  id: number
  url: string
}

export interface HouseholdIn {
  family_name: string
  resident_count: number
  street?: string | null
}

export interface HouseholdUpdate {
  family_name?: string
  resident_count?: number
  street?: string | null
  family_history?: string | null
  generations_here?: number | null
  visibility?: HouseholdVisibility
}

export type PostType = 'help' | 'announcement' | 'charity' | 'event' | 'newcomer' | 'share' | 'poll'
export type HelpCategory = 'tool' | 'ride' | 'labor' | 'childcare' | 'other'
export type PostStatus = 'open' | 'resolved' | 'closed'
export type DiscoverScope = 'region' | 'country'

/** One page of a feed. `next_cursor === null` means there is nothing after it —
 *  that, not the item count, is how the client knows it has reached the end. */
export interface FeedPage {
  items: Post[]
  next_cursor: string | null
}

/** The daily briefing, counted across the whole mahalla by the server. */
export interface Bugun {
  open_help_count: number
  next_event: Post | null
}

export interface PostIn {
  type: PostType
  title?: string | null
  body?: string | null
  category?: HelpCategory | null
  event_date?: string | null
  goal?: string | null
  image_url?: string | null
  image_urls?: string[]
  /** Poll only: the question is the title, these are the answers. */
  options?: string[]
}

export interface PollOption {
  id: number
  text: string
  votes: number
}

/** A poll's live state, from the asking viewer's point of view. */
export interface Poll {
  options: PollOption[]
  total_votes: number
  /** What this viewer chose, if anything. Other people's choices are never named. */
  my_option_id: number | null
}

export interface Post {
  id: number
  type: PostType
  title: string
  body: string | null
  category: HelpCategory | null
  event_date: string | null
  goal: string | null
  image_url: string | null
  status: PostStatus
  author: User
  /** All photos, cover first. image_url stays the single cover for the feed. */
  image_urls: string[]
  author_place: string
  response_count: number
  my_response: boolean
  /** The raisi pinned this to the top of the feed. */
  pinned: boolean
  /** 🤲 Rahmat reactions and whether the viewer gave one. */
  rahmat_count: number
  my_rahmat: boolean
  /** Size of the discussion thread. */
  comment_count: number
  /** Poll posts only; null on every other type. */
  poll: Poll | null
  created_at: string
}

export interface Comment {
  id: number
  user: User
  body: string
  created_at: string
  /** The viewer may remove it (own comment / post author / raisi). */
  can_delete: boolean
}

export interface UploadResult {
  url: string
}

export interface DingDongResult {
  ok: boolean
  message: string
}

export interface PostResponse {
  id: number
  user: User
  message: string | null
  created_at: string
}

export interface PostDetail extends Post {
  responses: PostResponse[]
  resolved_helper: User | null
  comments: Comment[]
}

export type ProposalAction = 'none' | 'set_raisi' | 'ban_user'
export type ProposalStatus = 'seconding' | 'voting' | 'passed' | 'rejected' | 'expired'

export interface ProposalIn {
  title: string
  description?: string | null
  action: ProposalAction
  target_user_id?: number | null
}

export interface Proposal {
  id: number
  kind: 'coordination' | 'punitive'
  action: ProposalAction
  target: User | null
  title: string
  description: string | null
  status: ProposalStatus
  author: User
  seconds_count: number
  seconds_needed: number
  votes_yes: number
  votes_no: number
  quorum: number
  my_second: boolean
  my_vote: boolean | null
  voting_closes_at: string | null
  created_at: string
}

export type ServiceCategory = 'food' | 'goods' | 'rental' | 'service' | 'skill'

export interface ServiceIn {
  title: string
  category: ServiceCategory
  description?: string | null
  price?: string | null
  contact?: string | null
  /** The whole photo set. Omit on update to leave the existing photos alone. */
  image_urls?: string[]
}

export interface ServiceUpdate extends Partial<ServiceIn> {
  active?: boolean
}

export interface Service {
  id: number
  household_id: number
  household_name: string
  title: string
  category: ServiceCategory
  description: string | null
  price: string | null
  contact: string | null
  active: boolean
  image_urls: string[]
  created_at: string
}

export interface AdminPetition {
  mahalla: Mahalla
  district_name: string
  region_name: string
  petitioners: User[]
}

export interface AdminStats {
  users: number
  mahallas_active: number
  mahallas_pending: number
  mahallas_forming: number
  households: number
  posts: number
}
