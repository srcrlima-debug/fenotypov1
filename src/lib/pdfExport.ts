import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface SessionReportData {
  sessionName: string;
  sessionDate: string;
  totalParticipants: number;
  totalEvaluations: number;
  completionRate: number;
  averageTime: number;
  photoStats: Array<{
    fotoId: number;
    totalDeferido: number;
    totalIndeferido: number;
    totalNaoRespondido: number;
    percentDeferido: number;
    percentIndeferido: number;
    percentNaoRespondido: number;
    avgTime: number;
  }>;
  demographicData: {
    genero: { [key: string]: { deferido: number; indeferido: number; total: number } };
    faixaEtaria: { [key: string]: { deferido: number; indeferido: number; total: number } };
    regiao: { [key: string]: { deferido: number; indeferido: number; total: number } };
  };
  kpis: {
    mostDeferida: { fotoId: number; percent: number };
    mostIndeferida: { fotoId: number; percent: number };
    longestTime: { fotoId: number; time: number };
    consenso: number;
  };
  consensusData: Array<{
    fotoId: number;
    consenso: number;
    baixoConsenso: boolean;
  }>;
  temporalData?: Array<{
    sequencia: number;
    tempoMedio: number;
    respostasDeferidas: number;
    respostasIndeferidas: number;
  }>;
}

export const generateDetailedPDFReport = (data: SessionReportData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFillColor(59, 130, 246); // Primary color
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE ANÁLISE', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.sessionName, 105, 25, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPosition = 45;

  // Date and Generation Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data da Sessão: ${new Date(data.sessionDate).toLocaleDateString('pt-BR')}`, 20, yPosition);
  doc.text(`Relatório Gerado: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, yPosition + 5);
  yPosition += 20;

  // 1. ESTATÍSTICAS GERAIS
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition - 5, 180, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. ESTATÍSTICAS GERAIS', 20, yPosition);
  yPosition += 10;

  doc.autoTable({
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Participantes', data.totalParticipants.toString()],
      ['Total de Avaliações', data.totalEvaluations.toString()],
      ['Taxa de Conclusão', `${data.completionRate.toFixed(1)}%`],
      ['Tempo Médio por Avaliação', `${Math.round(data.averageTime)}s`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 60;

  // 2. PRINCIPAIS INDICADORES (KPIs)
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition - 5, 180, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PRINCIPAIS INDICADORES (KPIs)', 20, yPosition);
  yPosition += 10;

  doc.autoTable({
    startY: yPosition,
    head: [['Indicador', 'Foto', 'Valor']],
    body: [
      ['Foto Mais Deferida', `#${data.kpis.mostDeferida.fotoId}`, `${data.kpis.mostDeferida.percent.toFixed(1)}%`],
      ['Foto Mais Indeferida', `#${data.kpis.mostIndeferida.fotoId}`, `${data.kpis.mostIndeferida.percent.toFixed(1)}%`],
      ['Maior Tempo Médio', `#${data.kpis.longestTime.fotoId}`, `${Math.round(data.kpis.longestTime.time)}s`],
      ['Consenso Geral', '-', `${data.kpis.consenso.toFixed(1)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 60;

  // 3. ANÁLISE DE CONSENSO
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition - 5, 180, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. ANÁLISE DE CONSENSO', 20, yPosition);
  yPosition += 10;

  const lowConsensus = data.consensusData.filter(c => c.baixoConsenso);
  const highConsensus = data.consensusData.filter(c => !c.baixoConsenso);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fotos com Alto Consenso (≥70%): ${highConsensus.length}`, 20, yPosition);
  doc.text(`Fotos com Baixo Consenso (<70%): ${lowConsensus.length}`, 20, yPosition + 5);
  yPosition += 15;

  if (lowConsensus.length > 0) {
    doc.autoTable({
      startY: yPosition,
      head: [['Foto', 'Consenso', 'Status']],
      body: lowConsensus.map(item => [
        `#${item.fotoId}`,
        `${item.consenso.toFixed(1)}%`,
        'Baixo Consenso'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });

    yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 60;
  }

  // 4. ANÁLISE DEMOGRÁFICA
  doc.addPage();
  yPosition = 20;

  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition - 5, 180, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. ANÁLISE DEMOGRÁFICA', 20, yPosition);
  yPosition += 10;

  // Gênero
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4.1. Por Identidade de Gênero', 20, yPosition);
  yPosition += 7;

  const generoData = Object.entries(data.demographicData.genero).map(([genero, stats]) => [
    genero,
    stats.total.toString(),
    stats.deferido.toString(),
    stats.indeferido.toString(),
    `${((stats.deferido / stats.total) * 100).toFixed(1)}%`
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['Gênero', 'Total', 'Deferidos', 'Indeferidos', '% Deferido']],
    body: generoData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 60;

  // Faixa Etária
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4.2. Por Faixa Etária', 20, yPosition);
  yPosition += 7;

  const faixaEtariaData = Object.entries(data.demographicData.faixaEtaria).map(([faixa, stats]) => [
    faixa,
    stats.total.toString(),
    stats.deferido.toString(),
    stats.indeferido.toString(),
    `${((stats.deferido / stats.total) * 100).toFixed(1)}%`
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['Faixa Etária', 'Total', 'Deferidos', 'Indeferidos', '% Deferido']],
    body: faixaEtariaData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPosition + 60;

  // Região
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('4.3. Por Região', 20, yPosition);
  yPosition += 7;

  const regiaoData = Object.entries(data.demographicData.regiao).map(([regiao, stats]) => [
    regiao,
    stats.total.toString(),
    stats.deferido.toString(),
    stats.indeferido.toString(),
    `${((stats.deferido / stats.total) * 100).toFixed(1)}%`
  ]);

  doc.autoTable({
    startY: yPosition,
    head: [['Região', 'Total', 'Deferidos', 'Indeferidos', '% Deferido']],
    body: regiaoData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  // 5. ANÁLISE POR FOTO (Top 10 mais problemáticas)
  doc.addPage();
  yPosition = 20;

  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition - 5, 180, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. ANÁLISE DETALHADA POR FOTO', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Top 10 fotos com maior divergência de opiniões:', 20, yPosition);
  yPosition += 7;

  const topDivergent = [...data.photoStats]
    .sort((a, b) => {
      const diffA = Math.abs(a.percentDeferido - a.percentIndeferido);
      const diffB = Math.abs(b.percentDeferido - b.percentIndeferido);
      return diffA - diffB;
    })
    .slice(0, 10);

  doc.autoTable({
    startY: yPosition,
    head: [['Foto', 'Deferido', 'Indeferido', 'Não Resp.', 'Tempo Médio']],
    body: topDivergent.map(photo => [
      `#${photo.fotoId}`,
      `${photo.percentDeferido.toFixed(1)}%`,
      `${photo.percentIndeferido.toFixed(1)}%`,
      `${photo.percentNaoRespondido.toFixed(1)}%`,
      `${Math.round(photo.avgTime)}s`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  // 6. ANÁLISE TEMPORAL (se disponível)
  if (data.temporalData && data.temporalData.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, 180, 8, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('6. ANÁLISE TEMPORAL E FADIGA', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Evolução do desempenho ao longo da sessão:', 20, yPosition);
    yPosition += 7;

    doc.autoTable({
      startY: yPosition,
      head: [['Sequência', 'Tempo Médio', 'Deferidos', 'Indeferidos']],
      body: data.temporalData.map(item => [
        `${item.sequencia * 100}-${(item.sequencia + 1) * 100}`,
        `${Math.round(item.tempoMedio)}s`,
        item.respostasDeferidas.toString(),
        item.respostasIndeferidas.toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
  }

  // 7. CONCLUSÕES E RECOMENDAÇÕES
  doc.addPage();
  yPosition = 20;

  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPosition - 5, 180, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('7. CONCLUSÕES E RECOMENDAÇÕES', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Principais Observações:', 20, yPosition);
  yPosition += 7;

  doc.setFont('helvetica', 'normal');
  const conclusions = [
    `• Taxa de conclusão de ${data.completionRate.toFixed(1)}% indica ${data.completionRate > 80 ? 'alto' : data.completionRate > 60 ? 'médio' : 'baixo'} engajamento`,
    `• Consenso geral de ${data.kpis.consenso.toFixed(1)}% sugere ${data.kpis.consenso > 70 ? 'boa' : 'necessidade de maior'} consistência`,
    `• ${lowConsensus.length} fotos com baixo consenso requerem atenção especial`,
    `• Tempo médio de ${Math.round(data.averageTime)}s por avaliação está ${data.averageTime > 45 ? 'acima' : 'dentro'} do esperado`,
  ];

  conclusions.forEach(conclusion => {
    doc.text(conclusion, 20, yPosition);
    yPosition += 6;
  });

  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Recomendações:', 20, yPosition);
  yPosition += 7;

  doc.setFont('helvetica', 'normal');
  const recommendations = [
    '• Revisar fotos com baixo consenso em discussão coletiva',
    '• Considerar treinamento adicional para áreas de maior divergência',
    '• Analisar padrões demográficos para identificar possíveis vieses',
    '• Monitorar fadiga dos avaliadores em sessões longas',
  ];

  recommendations.forEach(rec => {
    doc.text(rec, 20, yPosition);
    yPosition += 6;
  });

  // Footer em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
    doc.text(
      'Relatório Confidencial - Uso Interno',
      105,
      285,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `relatorio_detalhado_${data.sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);

  return fileName;
};
