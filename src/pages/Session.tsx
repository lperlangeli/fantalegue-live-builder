import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session as SessionType, Participant, Player, Assignment, CurrentPlayer } from "@/types/fantacalcio";
import { players as playerData } from "@/data/players";
import logo from "@/assets/logo_fantabuilder.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerManagement } from "@/components/session/PlayerManagement";
import { LivePlayer } from "@/components/session/LivePlayer";
import { PlayerList } from "@/components/session/PlayerList";
import { ParticipantsList } from "@/components/session/ParticipantsList";

const Session = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionType | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [players] = useState<Player[]>(playerData);
  const [selectedRole, setSelectedRole] = useState<'P' | 'D' | 'C' | 'A'>('P');

  useEffect(() => {
    if (!sessionId) return;

    loadSessionData();
    setupRealtimeSubscriptions();
  }, [sessionId]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    // Load session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessionData) setSession(sessionData as SessionType);

    // Load participants
    const { data: participantsData } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');
    if (participantsData) setParticipants(participantsData);

    // Load assignments
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*')
      .eq('session_id', sessionId);
    if (assignmentsData) setAssignments(assignmentsData);

    // Load current player
    const { data: currentPlayerData } = await supabase
      .from('current_player')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (currentPlayerData) setCurrentPlayer(currentPlayerData);

    // Identify current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user && participantsData) {
      const currentParticipant = participantsData.find(p => p.user_id === user.id);
      if (currentParticipant) setCurrentUser(currentParticipant);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, 
        () => loadSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `session_id=eq.${sessionId}` }, 
        () => loadSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'current_player', filter: `session_id=eq.${sessionId}` }, 
        () => loadSessionData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const isAdmin = currentUser?.is_admin || false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="FantaBuilder" className="h-10" />
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Codice: {session?.code}</div>
            <div className="text-sm font-medium">{currentUser?.nickname} {isAdmin && "(Admin)"}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Management */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="gestione" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gestione">G</TabsTrigger>
                <TabsTrigger value="formazione">F</TabsTrigger>
                <TabsTrigger value="statistiche">S</TabsTrigger>
              </TabsList>
              <TabsContent value="gestione" className="mt-4">
                <PlayerManagement 
                  sessionId={sessionId!}
                  players={players}
                  assignments={assignments}
                  isAdmin={isAdmin}
                  onRoleChange={setSelectedRole}
                />
              </TabsContent>
              <TabsContent value="formazione">
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  Formazione (arriva dopo)
                </div>
              </TabsContent>
              <TabsContent value="statistiche">
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  Statistiche (arriva dopo)
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Center Column - Live Player */}
          <div className="lg:col-span-1">
            <LivePlayer
              sessionId={sessionId!}
              currentPlayer={currentPlayer}
              players={players}
              participants={participants}
              assignments={assignments}
              isAdmin={isAdmin}
            />
          </div>

          {/* Right Column - Players by Quotation */}
          <div className="lg:col-span-1">
            <PlayerList 
              players={players} 
              assignments={assignments}
              selectedRole={selectedRole}
              sessionId={sessionId!}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Participants Section */}
        <ParticipantsList 
          participants={participants}
          assignments={assignments}
          players={players}
        />
      </div>
    </div>
  );
};

export default Session;
