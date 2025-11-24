import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ParticipantPresence {
  user_id: string;
  name: string;
  joined_at: string;
}

type PresenceState = Record<string, ParticipantPresence[]>;

interface AntessalaParticipantsMonitorProps {
  sessionId: string;
}

export function AntessalaParticipantsMonitor({ sessionId }: AntessalaParticipantsMonitorProps) {
  const [participants, setParticipants] = useState<PresenceState>({});
  const [count, setCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel(`antessala-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        setParticipants(state);
        setCount(Object.keys(state).length);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Novo participante na antessala:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Participante saiu da antessala:', leftPresences);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500 animate-pulse" />
          Participantes na Antessala
          <Badge variant="secondary" className="ml-auto">
            {count} online
          </Badge>
        </CardTitle>
        <CardDescription>
          Acompanhamento em tempo real dos participantes aguardando
        </CardDescription>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum participante na antessala</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {Object.entries(participants).map(([key, presences]) => (
                presences.map((presence, idx) => (
                  <div
                    key={`${key}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{presence.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Entrou {formatDistance(new Date(presence.joined_at), new Date(), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
