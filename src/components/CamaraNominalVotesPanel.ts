import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import type { NominalVoteSession } from '@/services/legislative';

export class CamaraNominalVotesPanel extends Panel {
  private sessions: NominalVoteSession[] = [];
  private onSessionClick?: (votacaoId: string) => void;

  constructor() {
    super({
      id: 'camara-votos-br',
      title: 'Camara - Votos Nominais',
      showCount: true,
      trackActivity: true,
      infoTooltip: 'Votacoes nominais recentes da Camara dos Deputados com dados de votos individuais.',
    });
    this.showLoading('Carregando votacoes nominais...');
  }

  public setSessionClickHandler(handler: (votacaoId: string) => void): void {
    this.onSessionClick = handler;
  }

  public setSessions(sessions: NominalVoteSession[]): void {
    this.sessions = sessions;
    this.setCount(sessions.length);
    this.renderContent();
  }

  private renderContent(): void {
    if (!this.sessions.length) {
      this.setContent('<div class="panel-empty">Nenhuma votacao nominal encontrada no periodo.</div>');
      return;
    }

    const rows = this.sessions.slice(0, 30).map((session) => {
      const time = session.dataHoraRegistroIso
        ? new Date(session.dataHoraRegistroIso).toLocaleString('pt-BR')
        : '-';
      const title = session.proposicao?.codigo
        ? `${session.proposicao.codigo} - ${session.proposicao.ementa || session.descricao}`
        : (session.descricao || `Votacao ${session.votacaoId}`);

      return `
        <tr class="camara-voto-row" data-votacao-id="${escapeHtml(session.votacaoId)}">
          <td>${escapeHtml(time)}</td>
          <td>${escapeHtml(session.siglaOrgao || '-')}</td>
          <td>${escapeHtml(title)}</td>
          <td>${session.votosCount}</td>
        </tr>
      `;
    }).join('');

    this.setContent(`
      <div class="camara-votos-panel-content">
        <table class="panel-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Orgao</th>
              <th>Proposicao / Tema</th>
              <th>Votos</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);

    this.content.querySelectorAll('.camara-voto-row').forEach((row) => {
      row.addEventListener('click', () => {
        const votacaoId = (row as HTMLElement).dataset.votacaoId;
        if (votacaoId) this.onSessionClick?.(votacaoId);
      });
    });
  }
}
