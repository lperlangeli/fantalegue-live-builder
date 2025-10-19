import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player, Assignment } from "@/types/fantacalcio";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlayerListProps {
  players: Player[];
  assignments: Assignment[];
}

export const PlayerList = ({ players, assignments }: PlayerListProps) => {
  const assignedPlayerIds = useMemo(() => 
    new Set(assignments.map(a => a.player_id)), 
    [assignments]
  );

  const sortedPlayers = useMemo(() => 
    [...players].sort((a, b) => b.fvm - a.fvm),
    [players]
  );

  const roleColors = {
    P: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    D: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    C: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    A: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };

  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4">Elenco per Quotazione</h2>
      
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {sortedPlayers.map(player => (
            <div
              key={player.id}
              className={`p-3 border rounded-lg transition-all ${
                assignedPlayerIds.has(player.id) ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${roleColors[player.ruolo]}`}>
                      {player.ruolo}
                    </Badge>
                    <span className="font-medium">{player.nome}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{player.squadra}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{player.fvm}</div>
                  {assignedPlayerIds.has(player.id) && (
                    <div className="text-xs text-destructive">✓</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
