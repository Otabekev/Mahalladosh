/** Mirrors api/app/schemas.py — keep in sync when the backend contract changes. */

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
  user: User
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
  members: HouseholdMember[]
  created_by: number
  created_at: string
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

export type PostType = 'help' | 'announcement' | 'charity' | 'event' | 'newcomer'
export type HelpCategory = 'tool' | 'ride' | 'labor' | 'childcare' | 'other'
export type PostStatus = 'open' | 'resolved' | 'closed'

export interface PostIn {
  type: PostType
  title: string
  body?: string | null
  category?: HelpCategory | null
  event_date?: string | null
  goal?: string | null
}

export interface Post {
  id: number
  type: PostType
  title: string
  body: string | null
  category: HelpCategory | null
  event_date: string | null
  goal: string | null
  status: PostStatus
  author: User
  response_count: number
  my_response: boolean
  created_at: string
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
