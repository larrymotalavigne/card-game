import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatsService, PlayerStats, GameResult } from '../../services/stats.service';
import { DeckService } from '../../services/deck.service';
import { Card as PrimeCard } from 'primeng/card';
import { Button } from 'primeng/button';
import { Table, TableModule } from 'primeng/table';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-stats',
  imports: [
    CommonModule,
    PrimeCard,
    Button,
    TableModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Dialog,
  ],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit {
  playerStats: PlayerStats | null = null;
  showClearDialog = false;

  constructor(
    public statsService: StatsService,
    private deckService: DeckService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.playerStats = this.statsService.getPlayerStats();
  }

  getDeckName(deckId: string): string {
    if (deckId === 'quick') return 'Deck Aléatoire';
    const deck = this.deckService.getDeckById(deckId);
    return deck?.name || 'Deck Inconnu';
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getWinRateColor(winRate: number): string {
    if (winRate >= 0.6) return 'success';
    if (winRate >= 0.4) return 'warn';
    return 'danger';
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  confirmClearStats(): void {
    this.showClearDialog = true;
  }

  clearStats(): void {
    this.statsService.clearStats();
    this.loadStats();
    this.showClearDialog = false;
  }

  exportStats(): void {
    const data = this.statsService.exportStats();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-wars-stats-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
