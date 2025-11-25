import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface SessionData {
  id: string;
  nome: string;
  data: string;
  descricao: string | null;
  session_status: string;
  training_id: string;
  participant_count: number;
}

interface ParticipantData {
  email: string;
  genero: string;
  faixa_etaria: string;
  estado: string;
  regiao: string | null;
  experiencia_bancas: string | null;
  pertencimento_racial: string | null;
}

export async function exportSessionsToPDF(sessions: SessionData[]) {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Relatório de Sessões de Treinamento', 14, 20);
  
  // Data de geração
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
  
  // Tabela de sessões
  const tableData = sessions.map(session => [
    session.nome,
    new Date(session.data).toLocaleDateString('pt-BR'),
    getStatusLabel(session.session_status),
    session.participant_count.toString(),
    session.descricao?.substring(0, 50) || '-'
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [['Nome', 'Data', 'Status', 'Participantes', 'Descrição']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Estatísticas gerais
  const totalSessions = sessions.length;
  const totalParticipants = sessions.reduce((sum, s) => sum + s.participant_count, 0);
  const avgParticipants = totalSessions > 0 ? (totalParticipants / totalSessions).toFixed(1) : '0';
  
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(10);
  doc.text(`Total de Sessões: ${totalSessions}`, 14, finalY + 10);
  doc.text(`Total de Participantes: ${totalParticipants}`, 14, finalY + 16);
  doc.text(`Média de Participantes por Sessão: ${avgParticipants}`, 14, finalY + 22);
  
  doc.save(`relatorio-sessoes-${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function exportSessionsToExcel(sessions: SessionData[]) {
  // Buscar dados detalhados de participantes para cada sessão
  const sessionsWithDetails = await Promise.all(
    sessions.map(async (session) => {
      let participants: ParticipantData[] = [];
      
      if (session.training_id) {
        const { data } = await supabase
          .from('training_participants')
          .select('email, genero, faixa_etaria, estado, regiao, experiencia_bancas, pertencimento_racial')
          .eq('training_id', session.training_id);
        
        participants = data || [];
      }
      
      return {
        session,
        participants
      };
    })
  );
  
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Resumo de Sessões
  const sessionsData = sessions.map(session => ({
    'Nome': session.nome,
    'Data': new Date(session.data).toLocaleDateString('pt-BR'),
    'Status': getStatusLabel(session.session_status),
    'Participantes': session.participant_count,
    'Descrição': session.descricao || '-'
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(sessionsData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Sessões');
  
  // Sheet 2: Participantes por Sessão
  const participantsData: any[] = [];
  sessionsWithDetails.forEach(({ session, participants }) => {
    participants.forEach(participant => {
      participantsData.push({
        'Sessão': session.nome,
        'Data da Sessão': new Date(session.data).toLocaleDateString('pt-BR'),
        'Email': participant.email,
        'Gênero': participant.genero,
        'Faixa Etária': participant.faixa_etaria,
        'Estado': participant.estado,
        'Região': participant.regiao || '-',
        'Experiência Bancas': participant.experiencia_bancas || '-',
        'Pertencimento Racial': participant.pertencimento_racial || '-'
      });
    });
  });
  
  const ws2 = XLSX.utils.json_to_sheet(participantsData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Participantes');
  
  // Sheet 3: Estatísticas
  const stats = [
    { 'Métrica': 'Total de Sessões', 'Valor': sessions.length },
    { 'Métrica': 'Total de Participantes', 'Valor': sessions.reduce((sum, s) => sum + s.participant_count, 0) },
    { 'Métrica': 'Média de Participantes por Sessão', 'Valor': sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.participant_count, 0) / sessions.length).toFixed(1) : '0' },
    { 'Métrica': 'Sessões Ativas', 'Valor': sessions.filter(s => s.session_status === 'active').length },
    { 'Métrica': 'Sessões Aguardando', 'Valor': sessions.filter(s => s.session_status === 'waiting').length },
    { 'Métrica': 'Sessões Concluídas', 'Valor': sessions.filter(s => s.session_status === 'completed').length }
  ];
  
  const ws3 = XLSX.utils.json_to_sheet(stats);
  XLSX.utils.book_append_sheet(wb, ws3, 'Estatísticas');
  
  // Salvar arquivo
  XLSX.writeFile(wb, `relatorio-sessoes-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function getStatusLabel(status: string) {
  switch (status) {
    case "waiting":
      return "Aguardando";
    case "active":
      return "Ativa";
    case "showing_results":
      return "Mostrando Resultados";
    case "completed":
      return "Concluída";
    default:
      return status;
  }
}
