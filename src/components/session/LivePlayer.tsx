import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Player, Participant, Assignment, CurrentPlayer } from "@/types/fantacalcio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface LivePlayerProps {
  sessionId: string;
  currentPlayer: CurrentPlayer | null;
  players: Player[];
  participants: Participant[];
  assignments: Assignment[];
  isAdmin: boolean;
}

export const LivePlayer = ({ sessionId, currentPlayer, players, participants, assignments, isAdmin }: LivePlayerProps) => {
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [price, setPrice] = useState('');

  const player = players.find(p => p.id === currentPlayer?.player_id);
  const assignedTo = assignments.find(a => a.player_id === currentPlayer?.player_id);

  const handleAssign = async () => {
    if (!player || !selectedParticipantId || !price) {
      toast.error("Seleziona partecipante e prezzo");
      return;
    }

    const priceNum = parseInt(price);
    if (priceNum < 1) {
      toast.error("Prezzo minimo: 1 credito");
      return;
    }

    const participant = participants.find(p => p.id === selectedParticipantId);
    if (!participant) return;

    if (participant.credits_remaining < priceNum) {
      toast.error("Crediti insufficienti");
      return;
    }

    // Verifica vincoli ruolo
    const participantAssignments = assignments.filter(a => a.participant_id === selectedParticipantId);
    const roleCount = participantAssignments.filter(a => {
      const p = players.find(pl => pl.id === a.player_id);
      return p?.ruolo === player.ruolo;
    }).length;

    const roleLimits = { P: 3, D: 8, C: 8, A: 6 };
    if (roleCount >= roleLimits[player.ruolo]) {
      toast.error(`Limite ${player.ruolo} raggiunto (${roleLimits[player.ruolo]})`);
      return;
    }

    try {
      // Crea assegnazione
      const { error: assignError } = await supabase
        .from('assignments')
        .insert({
          session_id: sessionId,
          participant_id: selectedParticipantId,
          player_id: player.id,
          price: priceNum
        });

      if (assignError) throw assignError;

      // Aggiorna crediti
      const { error: updateError } = await supabase
        .from('participants')
        .update({ credits_remaining: participant.credits_remaining - priceNum })
        .eq('id', selectedParticipantId);

      if (updateError) throw updateError;

      toast.success(`${player.nome} assegnato a ${participant.nickname}`);
      setPrice('');
      setSelectedParticipantId('');
    } catch (error: any) {
      console.error("Error assigning player:", error);
      toast.error(error.message || "Errore nell'assegnazione");
    }
  };

  const handleUndo = async () => {
    if (!assignments.length) return;

    const lastAssignment = assignments[assignments.length - 1];
    const participant = participants.find(p => p.id === lastAssignment.participant_id);
    if (!participant) return;

    try {
      // Rimuovi assegnazione
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', lastAssignment.id);

      if (deleteError) throw deleteError;

      // Ripristina crediti
      const { error: updateError } = await supabase
        .from('participants')
        .update({ credits_remaining: participant.credits_remaining + lastAssignment.price })
        .eq('id', participant.id);

      if (updateError) throw updateError;

      toast.success("Assegnazione annullata");
    } catch (error: any) {
      console.error("Error undoing assignment:", error);
      toast.error(error.message || "Errore nell'annullamento");
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 text-center">Live del Giocatore</h2>

      {player ? (
        <div className="space-y-6">
          {/* Player Info */}
          <div className="text-center p-6 border-2 border-primary rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5">
            <Badge variant="secondary" className="mb-2">{player.ruolo}</Badge>
            <h3 className="text-2xl font-bold mb-1">{player.nome}</h3>
            <p className="text-muted-foreground mb-2">{player.squadra}</p>
            <div className="text-3xl font-bold text-primary">FVM: {player.fvm}</div>
          </div>

          {assignedTo ? (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Assegnato a</p>
              <p className="font-bold text-lg">
                {participants.find(p => p.id === assignedTo.participant_id)?.nickname}
              </p>
              <p className="text-primary font-bold">{assignedTo.price} crediti</p>
            </div>
          ) : isAdmin ? (
            <div className="space-y-4">
              <Select value={selectedParticipantId} onValueChange={setSelectedParticipantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona partecipante" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nickname} ({p.credits_remaining} crediti)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min="1"
                placeholder="Prezzo (crediti)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <div className="flex gap-2">
                <Button onClick={handleAssign} className="flex-1">
                  Conferma
                </Button>
                <Button onClick={handleUndo} variant="outline" disabled={!assignments.length}>
                  Undo
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 bg-muted rounded-lg text-muted-foreground">
              In attesa dell'admin...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-12 text-muted-foreground">
          Nessun giocatore selezionato
        </div>
      )}
    </Card>
  );
};
