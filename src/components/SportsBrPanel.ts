import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import {
  categorizeSportsMatches,
  digestFingerprint,
  fetchSportsBrDigest,
  getSportsBrDigestStatus,
} from '@/services/sports';
import type { SportsBrDigest, SportsMatch } from '@/types/sports';

type SportsView = 'live' | 'upcoming' | 'results';

export class SportsBrPanel extends Panel {
  private digest: SportsBrDigest | null = null;
  private view: SportsView = 'live';
  private loading = true;
  private error: string | null = null;
  private lastFingerprint = '';

  constructor() {
    super({
      id: 'esportes-br',
      title: 'Esportes BR',
      showCount: true,
      trackActivity: true,
      infoTooltip: 'Resultados e agenda de competicoes brasileiras com fallback de provedores.',
    });

    void this.refresh();
  }

  public setDigest(digest: SportsBrDigest): void {
    this.digest = digest;
    this.error = null;
    this.loading = false;
    this.lastFingerprint = digestFingerprint(digest);
    this.updateCount();
    this.render();
  }

  public getDigest(): SportsBrDigest | null {
    return this.digest;
  }

  public async refresh(): Promise<boolean> {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const digest = await fetchSportsBrDigest({ signal: this.signal });
      const nextFingerprint = digestFingerprint(digest);
      const changed = nextFingerprint !== this.lastFingerprint;

      this.digest = digest;
      this.lastFingerprint = nextFingerprint;
      this.loading = false;
      this.error = null;
      this.updateCount();
      this.render();

      return changed;
    } catch (error) {
      if (this.isAbortError(error)) {
        return false;
      }

      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Falha ao carregar esportes';
      this.render();
      return true;
    }
  }

  private updateCount(): void {
    if (!this.digest) {
      this.setCount(0);
      return;
    }

    const categorized = categorizeSportsMatches(this.digest.matches);
    const liveCount = categorized.live.length;
    this.setCount(liveCount > 0 ? liveCount : this.digest.matches.length);
  }

  private render(): void {
    if (this.loading) {
      this.showLoading('Carregando esportes BR...');
      return;
    }

    if (this.error && !this.digest) {
      this.setContent(`
        <div class="sports-br-error">
          <div class="panel-empty">${escapeHtml(this.error)}</div>
          <button class="sports-br-retry" type="button">Tentar novamente</button>
        </div>
      `);
      this.bindRetry();
      return;
    }

    if (!this.digest) {
      this.setContent('<div class="panel-empty">Sem dados de esportes.</div>');
      return;
    }

    const grouped = categorizeSportsMatches(this.digest.matches);
    const selected = this.view === 'live'
      ? grouped.live
      : this.view === 'upcoming'
        ? grouped.upcoming
        : grouped.results;

    const providerState = getSportsBrDigestStatus();
    const warningsHtml = this.digest.warnings.length > 0
      ? `<div class="sports-br-warnings">${this.digest.warnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join('')}</div>`
      : '';

    const rowsHtml = selected.length > 0
      ? selected.map((match) => this.renderMatchRow(match)).join('')
      : '<div class="panel-empty">Nenhuma partida nesta aba.</div>';

    this.setContent(`
      <div class="sports-br-panel">
        <div class="sports-br-meta">
          <span class="sports-br-provider">Fonte: ${escapeHtml(this.digest.providerUsed)}</span>
          <span class="sports-br-state">Estado: ${escapeHtml(providerState)}</span>
          <span class="sports-br-updated">Atualizado: ${new Date(this.digest.generatedAt).toLocaleString('pt-BR')}</span>
        </div>

        <div class="sports-br-tabs">
          ${this.renderTabButton('live', 'Ao vivo', grouped.live.length)}
          ${this.renderTabButton('upcoming', 'Proximos', grouped.upcoming.length)}
          ${this.renderTabButton('results', 'Resultados', grouped.results.length)}
        </div>

        <div class="sports-br-list">${rowsHtml}</div>
        ${warningsHtml}
        ${this.error ? `<div class="sports-br-soft-error">${escapeHtml(this.error)}</div>` : ''}
        <button class="sports-br-retry" type="button">Atualizar</button>
      </div>
    `);

    this.bindTabEvents();
    this.bindRetry();
  }

  private renderTabButton(key: SportsView, label: string, count: number): string {
    const activeClass = this.view === key ? 'active' : '';
    return `<button class="sports-br-tab ${activeClass}" data-view="${key}" type="button">${label} <span>${count}</span></button>`;
  }

  private renderMatchRow(match: SportsMatch): string {
    const scoreHome = match.score.home ?? '-';
    const scoreAway = match.score.away ?? '-';
    const minute = match.minute != null ? `${match.minute}'` : '';

    return `
      <div class="sports-br-row" data-match-id="${escapeHtml(match.id)}">
        <div class="sports-br-row-head">
          <span class="sports-br-league">${escapeHtml(match.competition)}</span>
          <span class="sports-br-status">${escapeHtml(match.statusLabel)} ${escapeHtml(minute)}</span>
        </div>
        <div class="sports-br-teams">
          <span class="sports-br-team home">${escapeHtml(match.homeTeam.shortName)}</span>
          <span class="sports-br-score">${scoreHome} x ${scoreAway}</span>
          <span class="sports-br-team away">${escapeHtml(match.awayTeam.shortName)}</span>
        </div>
        <div class="sports-br-foot">
          <span>${new Date(match.kickoffUtc).toLocaleString('pt-BR')}</span>
          ${match.venue ? `<span>${escapeHtml(match.venue)}</span>` : ''}
        </div>
      </div>
    `;
  }

  private bindTabEvents(): void {
    this.content.querySelectorAll<HTMLButtonElement>('.sports-br-tab').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.view;
        if (value === 'live' || value === 'upcoming' || value === 'results') {
          this.view = value;
          this.render();
        }
      });
    });
  }

  private bindRetry(): void {
    const retryButton = this.content.querySelector<HTMLButtonElement>('.sports-br-retry');
    if (!retryButton) {
      return;
    }

    retryButton.addEventListener('click', () => {
      void this.refresh();
    });
  }
}
