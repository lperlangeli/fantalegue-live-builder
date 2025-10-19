import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Participant, Assignment, Player } from "@/types/fantacalcio";

interface ParticipantsListProps {
  participants: Participant[];
  assignments: Assignment[];
  players: Player[];
}

export const ParticipantsList = ({ participants, assignments, players }: ParticipantsListProps) => {
  const getParticipantRoster = (participantId: string) => {
    const participantAssignments = assignments.filter(a => a.participant_id === participantId);
    
    const roster = {
      P: [] as { player: Player; price: number }[],
      D: [] as { player: Player; price: number }[],
      C: [] as { player: Player; price: number }[],
      A: [] as { player: Player; price: number }[],
    };

    participantAssignments.forEach(assignment => {
      const player = players.find(p => p.id === assignment.player_id);
      if (player) {
        roster[player.ruolo].push({ player, price: assignment.price });
      }
    });

    return roster;
  };

  const roleLabels = {
    P: 'Portieri',
    D: 'Difensori',
    C: 'Centrocampisti',
    A: 'Attaccanti'
  };

  const roleLimits = { P: 3, D: 8, C: 8, A: 6 };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Partecipanti</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {participants.map(participant => {
          const roster = getParticipantRoster(participant.id);
          
          return (
            <Card key={participant.id} className="p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{participant.nickname}</h3>
                  {participant.is_admin && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {participant.credits_remaining} crediti
                </div>
              </div>

              <div className="space-y-3">
                {(['P', 'D', 'C', 'A'] as const).map(role => (
                  <div key={role} className="border-t pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{roleLabels[role]}</span>
                      <Badge variant="outline" className="text-xs">
                        {roster[role].length}/{roleLimits[role]}
                      </Badge>
                    </div>
                    {roster[role].length > 0 ? (
                      <div className="space-y-1">
                        {roster[role].map(({ player, price }, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="truncate">{player.nome}</span>
                            <span className="text-primary font-medium ml-2">{price}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Nessun giocatore</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
