import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo_fantabuilder.png";

const CreateSession = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [numParticipants, setNumParticipants] = useState(8);
  const [budget, setBudget] = useState<500 | 1000>(500);
  const [auctionOrder, setAuctionOrder] = useState<'alfabetico' | 'random'>('alfabetico');
  const [startingLetter, setStartingLetter] = useState('A');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState('');

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateSession = async () => {
    if (!nickname.trim()) {
      toast.error("Inserisci il tuo nickname");
      return;
    }

    setLoading(true);
    try {
      // Sign in anonimamente
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const code = generateCode();
      
      // Crea sessione
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          code,
          num_participants: numParticipants,
          budget,
          auction_order: auctionOrder,
          starting_letter: auctionOrder === 'alfabetico' ? startingLetter : null,
          created_by: authData.user.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Crea tutti i partecipanti automaticamente
      const participantsToCreate = [];
      for (let i = 0; i < numParticipants; i++) {
        participantsToCreate.push({
          session_id: session.id,
          user_id: i === 0 ? authData.user.id : null,
          nickname: i === 0 ? nickname : `Squadra ${i + 1}`,
          credits_remaining: budget,
          is_admin: i === 0
        });
      }

      const { error: participantError } = await supabase
        .from('participants')
        .insert(participantsToCreate);

      if (participantError) throw participantError;

      setSessionCode(code);
      toast.success("Sessione creata!");
      
      setTimeout(() => {
        navigate(`/session/${session.id}`);
      }, 2000);
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Errore nella creazione della sessione");
    } finally {
      setLoading(false);
    }
  };

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <img src={logo} alt="FantaBuilder" className="mx-auto h-20 mb-4" />
          <h1 className="text-3xl font-bold">Crea Nuova Sessione</h1>
        </div>

        <Card className="max-w-2xl mx-auto p-8">
          {sessionCode ? (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold">Sessione Creata!</h2>
              <div className="p-6 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Codice Sessione:</p>
                <p className="text-4xl font-bold tracking-wider text-primary">{sessionCode}</p>
              </div>
              <p className="text-muted-foreground">Condividi questo codice con i partecipanti</p>
            </div>
          ) : (
            <>
              {/* Step 1: Numero Partecipanti */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-4">Numero Partecipanti</h2>
                    <Select value={numParticipants.toString()} onValueChange={(v) => setNumParticipants(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[6, 7, 8, 9, 10, 11, 12].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} partecipanti</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setStep(2)} className="w-full">Avanti</Button>
                </div>
              )}

              {/* Step 2: Budget */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-4">Budget per Partecipante</h2>
                    <RadioGroup value={budget.toString()} onValueChange={(v) => setBudget(parseInt(v) as 500 | 1000)}>
                      <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="500" id="500" />
                        <Label htmlFor="500" className="flex-1 cursor-pointer">500 crediti</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="1000" id="1000" />
                        <Label htmlFor="1000" className="flex-1 cursor-pointer">1000 crediti</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => setStep(1)} variant="outline" className="flex-1">Indietro</Button>
                    <Button onClick={() => setStep(3)} className="flex-1">Avanti</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Ordine Asta */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-4">Ordine Asta</h2>
                    <RadioGroup value={auctionOrder} onValueChange={(v) => setAuctionOrder(v as any)}>
                      <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="alfabetico" id="alfabetico" />
                        <Label htmlFor="alfabetico" className="flex-1 cursor-pointer">
                          <div className="font-medium">Alfabetico</div>
                          <div className="text-sm text-muted-foreground">Ordine alfabetico circolare per ruolo</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="random" id="random" />
                        <Label htmlFor="random" className="flex-1 cursor-pointer">
                          <div className="font-medium">Random</div>
                          <div className="text-sm text-muted-foreground">Ordine casuale senza ripetizioni</div>
                        </Label>
                      </div>
                    </RadioGroup>

                    {auctionOrder === 'alfabetico' && (
                      <div className="mt-4">
                        <Label>Lettera di partenza</Label>
                        <Select value={startingLetter} onValueChange={setStartingLetter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {letters.map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => setStep(2)} variant="outline" className="flex-1">Indietro</Button>
                    <Button onClick={() => setStep(4)} className="flex-1">Avanti</Button>
                  </div>
                </div>
              )}

              {/* Step 4: Nickname */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-4">Il Tuo Nickname</h2>
                    <Input
                      placeholder="Inserisci nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={20}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Vincoli rosa: 3 Portieri, 8 Difensori, 8 Centrocampisti, 6 Attaccanti
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => setStep(3)} variant="outline" className="flex-1">Indietro</Button>
                    <Button onClick={handleCreateSession} disabled={loading} className="flex-1">
                      {loading ? "Creazione..." : "Crea Sessione"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CreateSession;
