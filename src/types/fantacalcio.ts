export interface Player {
  id: number;
  nome: string;
  ruolo: 'P' | 'D' | 'C' | 'A';
  squadra: string;
  fvm: number;
}

export interface Session {
  id: string;
  code: string;
  num_participants: number;
  budget: number;
  auction_order: 'alfabetico' | 'random';
  starting_letter: string | null;
  created_at: string;
  created_by: string;
}

export interface Participant {
  id: string;
  session_id: string;
  user_id: string | null;
  nickname: string;
  credits_remaining: number;
  is_admin: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  session_id: string;
  participant_id: string;
  player_id: number;
  price: number;
  created_at: string;
}

export interface CurrentPlayer {
  session_id: string;
  player_id: number | null;
  updated_at: string;
}

export interface ShownPlayer {
  id: string;
  session_id: string;
  player_id: number;
  shown_at: string;
}
