import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo_fantabuilder.png";

const JoinSession = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || !nickname.trim()) {
      toast.error("Inserisci codice e nickname");
      return;
    }

    setLoading(true);
    try {
      // Sign in anonimamente
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      // Trova sessione
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (sessionError || !session) {
        toast.error("Codice sessione non valido");
        return;
      }

      // Verifica numero partecipanti
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if (count && count >= session.num_participants) {
        toast.error("Sessione al completo");
        return;
      }

      // Verifica nickname univoco
      const { data: existingNickname } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('nickname', nickname)
        .maybeSingle();

      if (existingNickname) {
        toast.error("Nickname già in uso");
        return;
      }

      // Crea partecipante
      const { error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          user_id: authData.user.id,
          nickname,
          credits_remaining: session.budget,
          is_admin: false
        });

      if (participantError) throw participantError;

      toast.success("Ingresso nella sessione!");
      navigate(`/session/${session.id}`);
    } catch (error: any) {
      console.error("Error joining session:", error);
      toast.error(error.message || "Errore nell'ingresso alla sessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <img src={logo} alt="FantaBuilder" className="mx-auto h-20 mb-4" />
          <h1 className="text-3xl font-bold">Partecipa a Sessione</h1>
        </div>

        <Card className="max-w-md mx-auto p-8">
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

            <div>
              <Label htmlFor="nickname">Il Tuo Nickname</Label>
              <Input
                id="nickname"
                placeholder="Inserisci nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="flex gap-4">
              <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                Annulla
              </Button>
              <Button onClick={handleJoin} disabled={loading} className="flex-1">
                {loading ? "Caricamento..." : "Partecipa"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JoinSession;
