-- Create table for players from the dataset
CREATE TABLE public.players (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('P', 'D', 'C', 'A')),
  squadra TEXT NOT NULL,
  fvm INTEGER NOT NULL
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  num_participants INTEGER NOT NULL CHECK (num_participants BETWEEN 6 AND 12),
  budget INTEGER NOT NULL CHECK (budget IN (500, 1000)),
  auction_order TEXT NOT NULL CHECK (auction_order IN ('alfabetico', 'random')),
  starting_letter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions are viewable by participants"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Create participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  credits_remaining INTEGER NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, nickname)
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants are viewable by session members"
  ON public.participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join as participants"
  ON public.participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update participants"
  ON public.participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.session_id = participants.session_id
      AND p.user_id = auth.uid()
      AND p.is_admin = true
    )
  );

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES public.players(id),
  price INTEGER NOT NULL CHECK (price >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, player_id)
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments are viewable by session members"
  ON public.assignments FOR SELECT
  USING (true);

CREATE POLICY "Admin can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.session_id = assignments.session_id
      AND p.user_id = auth.uid()
      AND p.is_admin = true
    )
  );

CREATE POLICY "Admin can delete assignments (undo)"
  ON public.assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.session_id = assignments.session_id
      AND p.user_id = auth.uid()
      AND p.is_admin = true
    )
  );

-- Create current player table for realtime sync
CREATE TABLE public.current_player (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES public.players(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.current_player ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Current player viewable by all"
  ON public.current_player FOR SELECT
  USING (true);

CREATE POLICY "Admin can update current player"
  ON public.current_player FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.session_id = current_player.session_id
      AND p.user_id = auth.uid()
      AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.session_id = current_player.session_id
      AND p.user_id = auth.uid()
      AND p.is_admin = true
    )
  );

-- Create shown players table
CREATE TABLE public.shown_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES public.players(id),
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, player_id)
);

ALTER TABLE public.shown_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shown players viewable by all"
  ON public.shown_players FOR SELECT
  USING (true);

CREATE POLICY "Admin can mark players as shown"
  ON public.shown_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.session_id = shown_players.session_id
      AND p.user_id = auth.uid()
      AND p.is_admin = true
    )
  );

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.current_player;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shown_players;