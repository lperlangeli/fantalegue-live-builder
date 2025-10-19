import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player, Assignment } from "@/types/fantacalcio";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlayerManagementProps {
  sessionId: string;
  players: Player[];
  assignments: Assignment[];
  isAdmin: boolean;
}

export const PlayerManagement = ({ sessionId, players, assignments, isAdmin }: PlayerManagementProps) => {
  const [selectedRole, setSelectedRole] = useState<'P' | 'D' | 'C' | 'A'>('P');
  const [searchTerm, setSearchTerm] = useState('');

  const assignedPlayerIds = useMemo(() => 
    new Set(assignments.map(a => a.player_id)), 
    [assignments]
  );

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => p.ruolo === selectedRole)
      .filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [players, selectedRole, searchTerm]);

  const handleSelectPlayer = async (player: Player) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('current_player')
      .upsert({
        session_id: sessionId,
        player_id: player.id,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error setting current player:", error);
    }
  };

  const roleLabels = {
    P: 'Portieri',
    D: 'Difensori',
    C: 'Centrocampisti',
    A: 'Attaccanti'
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Gestione</h2>

        {/* Role Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {(['P', 'D', 'C', 'A'] as const).map(role => (
            <Button
              key={role}
              variant={selectedRole === role ? 'default' : 'outline'}
              onClick={() => setSelectedRole(role)}
              size="sm"
            >
              {role}
            </Button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Cerca giocatore..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Players List */}
        <div>
          <div className="text-sm font-medium mb-2 flex items-center justify-between">
            <span>{roleLabels[selectedRole]}</span>
            <span className="text-muted-foreground">{filteredPlayers.length} giocatori</span>
          </div>
          
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredPlayers.map(player => (
                <div
                  key={player.id}
                  onClick={() => handleSelectPlayer(player)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isAdmin ? 'hover:bg-muted hover:border-primary' : 'cursor-default'
                  } ${assignedPlayerIds.has(player.id) ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{player.nome}</div>
                      <div className="text-xs text-muted-foreground">{player.squadra}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {player.fvm}
                      </Badge>
                      {assignedPlayerIds.has(player.id) && (
                        <div className="text-xs text-destructive mt-1">Assegnato</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
};
