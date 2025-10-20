import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session as SessionType, Participant, Player, CurrentPlayer, Role } from "@/types/database";
import PlayerManagement from "@/components/PlayerManagement";
import FormationSection from "@/components/FormationSection";
import StatisticsSection from "@/components/StatisticsSection";
import LivePlayer from "@/components/LivePlayer";
import PlayerList from "@/components/PlayerList";
import ParticipantsList from "@/components/ParticipantsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import logo from "@/assets/logo.png";

export default function Session() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionType | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userParticipant, setUserParticipant] = useState<Participant | null>(null);
  const [selectedRole, setSelectedRole] = useState<"P" | "D" | "C" | "A" | "ALL">("ALL");
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        toast.error("Sessione non trovata");
        navigate("/");
        return;
      }

      setSession(sessionData as SessionType);
      setIsAdmin(user?.id === sessionData.admin_id);

      // Load participants
      const { data: participantsData } = await supabase
        .from("participants")
        .select("*")
        .eq("session_id", sessionId)
        .order("position");

      if (participantsData) {
        setParticipants(participantsData as Participant[]);
        const userPart = participantsData.find(p => p.user_id === user?.id);
        setUserParticipant(userPart as Participant || null);
      }

      // Load current player
      const { data: currentPlayerData } = await supabase
        .from("current_player")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (currentPlayerData) {
        setCurrentPlayer(currentPlayerData as CurrentPlayer);
      }
      
      // If admin, check if we need to initialize player order
      if (user?.id === sessionData.admin_id) {
        const { data: orderExists } = await supabase
          .from("player_order")
          .select("id")
          .eq("session_id", sessionId)
          .limit(1);

        if (!orderExists || orderExists.length === 0) {
          await initializePlayerOrder(sessionData);
        }
      }
    };

    const initializePlayerOrder = async (sessionData: SessionType) => {
      console.log('Initializing player order for session:', sessionData.id);
      
      // Generate and save player order
      const { data: allPlayers } = await supabase
        .from("players")
        .select("*");

      console.log('All players fetched:', allPlayers?.length);

      if (!allPlayers || allPlayers.length === 0) return;

      let orderedPlayers: Player[] = [];

      if (sessionData.auction_order === 'alphabetical') {
        console.log('Using alphabetical order');
        const roleOrder = { 'P': 0, 'D': 1, 'C': 2, 'A': 3 };
        const sortedByRole = (allPlayers as Player[]).sort((a, b) => {
          const roleComparison = roleOrder[a.role] - roleOrder[b.role];
          if (roleComparison !== 0) return roleComparison;
          return a.name.localeCompare(b.name);
        });

        if (sessionData.starting_letter) {
          const startLetter = sessionData.starting_letter.toUpperCase();
          const roles: ('P' | 'D' | 'C' | 'A')[] = ['P', 'D', 'C', 'A'];
          roles.forEach(role => {
            const playersOfRole = sortedByRole.filter(p => p.role === role);
            const startIndex = playersOfRole.findIndex(p => p.name.charAt(0).toUpperCase() >= startLetter);
            if (startIndex !== -1) {
              orderedPlayers = [...orderedPlayers, ...playersOfRole.slice(startIndex), ...playersOfRole.slice(0, startIndex)];
            } else {
              orderedPlayers = [...orderedPlayers, ...playersOfRole];
            }
          });
        } else {
          orderedPlayers = sortedByRole;
        }
      } else if (sessionData.auction_order === 'random') {
        console.log('Using random order');
        const roles: ('P' | 'D' | 'C' | 'A')[] = ['P', 'D', 'C', 'A'];
        roles.forEach(role => {
          const playersOfRole = (allPlayers as Player[]).filter(p => p.role === role);
          for (let i = playersOfRole.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playersOfRole[i], playersOfRole[j]] = [playersOfRole[j], playersOfRole[i]];
          }
          orderedPlayers = [...orderedPlayers, ...playersOfRole];
        });
      }

      console.log('Ordered players created:', orderedPlayers.length);

      // Save order to database
      const orderData = orderedPlayers.map((player, index) => ({
        session_id: sessionData.id,
        player_id: player.id,
        order_index: index
      }));

      const { error: insertError } = await supabase
        .from("player_order")
        .insert(orderData);

      console.log('Player order inserted, error:', insertError);

      // Set first player
      if (orderedPlayers.length > 0) {
        const firstPlayer = orderedPlayers[0];
        console.log('Setting first player:', firstPlayer.name);
        
        await supabase
          .from("current_player")
          .update({ player_id: firstPlayer.id })
          .eq("session_id", sessionId);

        await supabase
          .from("selected_players")
          .delete()
          .eq("session_id", sessionId);

        await supabase
          .from("selected_players")
          .insert({ session_id: sessionId!, player_id: firstPlayer.id });
      }
    };

    loadSession();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`session_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadSession();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "current_player",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadSession();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assigned_players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, navigate]);

  const handleRoleChange = (role: Role) => {
    if (!isAdmin) {
      setSelectedRole(role);
      return;
    }

    setPendingRole(role);
    setShowRoleChangeDialog(true);
  };

  const handleRoleChangeConfirm = async () => {
    if (!pendingRole || !session) return;

    setSelectedRole(pendingRole);
    
    // Delete existing player order
    await supabase
      .from("player_order")
      .delete()
      .eq("session_id", sessionId!);

    // Reinitialize with new role-based order
    await initializePlayerOrderForRole(session, pendingRole);
    
    setShowRoleChangeDialog(false);
    setPendingRole(null);
    toast.success(`Iniziata selezione giocatori ruolo ${pendingRole}`);
  };

  const handleRoleChangeCancel = () => {
    if (pendingRole) {
      setSelectedRole(pendingRole);
    }
    setShowRoleChangeDialog(false);
    setPendingRole(null);
  };

  const initializePlayerOrderForRole = async (sessionData: SessionType, role: Role) => {
    const { data: allPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("role", role);

    if (!allPlayers || allPlayers.length === 0) return;

    let orderedPlayers: Player[] = [];

    if (sessionData.auction_order === 'alphabetical') {
      orderedPlayers = (allPlayers as Player[]).sort((a, b) => a.name.localeCompare(b.name));
      
      if (sessionData.starting_letter) {
        const startLetter = sessionData.starting_letter.toUpperCase();
        const startIndex = orderedPlayers.findIndex(p => p.name.charAt(0).toUpperCase() >= startLetter);
        if (startIndex !== -1) {
          orderedPlayers = [...orderedPlayers.slice(startIndex), ...orderedPlayers.slice(0, startIndex)];
        }
      }
    } else if (sessionData.auction_order === 'random') {
      orderedPlayers = [...allPlayers as Player[]];
      for (let i = orderedPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedPlayers[i], orderedPlayers[j]] = [orderedPlayers[j], orderedPlayers[i]];
      }
    }

    const orderData = orderedPlayers.map((player, index) => ({
      session_id: sessionData.id,
      player_id: player.id,
      order_index: index
    }));

    await supabase
      .from("player_order")
      .insert(orderData);

    if (orderedPlayers.length > 0) {
      const firstPlayer = orderedPlayers[0];
      
      await supabase
        .from("current_player")
        .update({ player_id: firstPlayer.id })
        .eq("session_id", sessionId);

      await supabase
        .from("selected_players")
        .delete()
        .eq("session_id", sessionId);

      await supabase
        .from("selected_players")
        .insert({ session_id: sessionId!, player_id: firstPlayer.id });
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="FantaBuilder" className="h-10" />
            <div>
              <h1 className="font-bold text-lg">FantaBuilder</h1>
              <p className="text-xs text-muted-foreground">
                Codice: <span className="font-mono font-bold text-primary">{session.session_code}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">{userParticipant?.nickname}</p>
            {isAdmin && (
              <p className="text-xs text-primary font-semibold">Admin</p>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Tab Navigation - Full Width */}
        <Tabs defaultValue="gestione" className="w-full mb-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="gestione">Gestione</TabsTrigger>
            <TabsTrigger value="formazione">Formazione</TabsTrigger>
            <TabsTrigger value="statistiche">Statistiche</TabsTrigger>
          </TabsList>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* Left: Tab Content */}
            <div className="lg:col-span-3">
              <TabsContent value="gestione" className="mt-0">
                <PlayerManagement 
                  sessionId={session.id} 
                  isAdmin={isAdmin}
                  onRoleChange={handleRoleChange}
                />
              </TabsContent>
              <TabsContent value="formazione" className="mt-0">
                <FormationSection />
              </TabsContent>
              <TabsContent value="statistiche" className="mt-0">
                <StatisticsSection />
              </TabsContent>
            </div>

            {/* Center: Live Player */}
            <div className="lg:col-span-6">
              <LivePlayer
                sessionId={session.id}
                session={session}
                currentPlayer={currentPlayer}
                participants={participants}
                isAdmin={isAdmin}
              />
            </div>

            {/* Right: Player List */}
            <div className="lg:col-span-3">
              <PlayerList sessionId={session.id} selectedRole={selectedRole} isAdmin={isAdmin} />
            </div>
          </div>
        </Tabs>

        {/* Bottom: Participants */}
        <div className="mt-6">
          <ParticipantsList
            sessionId={session.id}
            participants={participants}
            currentUserId={currentUser?.id}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={showRoleChangeDialog} onOpenChange={setShowRoleChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiare ruolo?</AlertDialogTitle>
            <AlertDialogDescription>
              Iniziare a chiamare giocatori del nuovo ruolo selezionato?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRoleChangeCancel}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChangeConfirm}>Sì</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
