import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo_fantabuilder.png";
import { Participant, Assignment } from "@/types/fantacalcio";
import { players as playerData } from "@/data/players";

const JoinSession = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'code' | 'select-team'>('code');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Participant[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCheckCode = async () => {
    if (!code.trim()) {
      toast.error("Inserisci il codice");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (sessionError || !session) {
        toast.error("Codice sessione non valido");
        return;
      }

      // Carica squadre disponibili (user_id è null)
      const { data: teams } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', session.id)
        .is('user_id', null)
        .order('created_at');

      if (!teams || teams.length === 0) {
        toast.error("Nessuna squadra disponibile");
        return;
      }

      // Carica assegnazioni per mostrare i giocatori già acquistati
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('session_id', session.id);

      setSessionId(session.id);
      setAvailableTeams(teams);
      setAssignments(assignmentsData || []);
      setStep('select-team');
    } catch (error: any) {
      console.error("Error checking session:", error);
      toast.error(error.message || "Errore nell'accesso");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (teamId: string, teamNickname: string) => {
    const nickname = prompt("Inserisci il tuo nickname:", teamNickname);
    if (!nickname || !nickname.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Aggiorna la squadra selezionata con user_id e nickname
      const { error } = await supabase
        .from('participants')
        .update({ 
          user_id: user.id,
          nickname: nickname.trim()
        })
        .eq('id', teamId);

      if (error) throw error;

      toast.success("Squadra selezionata!");
      navigate(`/session/${sessionId}`);
    } catch (error: any) {
      console.error("Error selecting team:", error);
      toast.error(error.message || "Errore nella selezione");
    } finally {
      setLoading(false);
    }
  };

  const getTeamPlayers = (teamId: string) => {
    return assignments
      .filter(a => a.participant_id === teamId)
      .map(a => {
        const player = playerData.find(p => p.id === a.player_id);
        return player ? `${player.nome} (${a.price})` : '';
      })
      .filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <img src={logo} alt="FantaBuilder" className="mx-auto h-20 mb-4" />
          <h1 className="text-3xl font-bold">Partecipa a Sessione</h1>
        </div>

        <Card className="max-w-2xl mx-auto p-8">
          {step === 'code' ? (
            <div className="space-y-6">
              <div>
                <Label htmlFor="code">Codice Sessione</Label>
                <Input
                  id="code"
                  placeholder="ES: ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
              </div>

              <div className="flex gap-4">
                <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                  Annulla
                </Button>
                <Button onClick={handleCheckCode} disabled={loading} className="flex-1">
                  {loading ? "Caricamento..." : "Avanti"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Seleziona la tua squadra</h2>
              
              <div className="grid gap-3 max-h-[500px] overflow-y-auto">
                {availableTeams.map(team => {
                  const teamPlayers = getTeamPlayers(team.id);
                  return (
                    <Card 
                      key={team.id}
                      className="p-4 cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectTeam(team.id, team.nickname)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{team.nickname}</h3>
                        <Badge variant="secondary">{team.credits_remaining} crediti</Badge>
                      </div>
                      
                      {teamPlayers.length > 0 ? (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium mb-1">Giocatori già acquistati:</p>
                          <div className="space-y-0.5">
                            {teamPlayers.map((p, i) => (
                              <div key={i}>{p}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nessun giocatore ancora</p>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Button onClick={() => setStep('code')} variant="outline" className="w-full">
                Indietro
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default JoinSession;
