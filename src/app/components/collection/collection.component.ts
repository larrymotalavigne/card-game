import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollectionService, CardCollectionEntry, CollectionStats } from '../../services/collection.service';
import { StatsService } from '../../services/stats.service';
import { CardService } from '../../services/card.service';
import { Card, Rarity, Domain } from '../../models/card.model';
import { CardComponent } from '../card/card.component';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';

interface FilteredCard {
  card: Card;
  entry: CardCollectionEntry;
}

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Button,
    ProgressBar,
    Select,
    InputText,
    Tag,
  ],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss',
})
export class CollectionComponent implements OnInit {
  stats: CollectionStats | null = null;
  allCards: FilteredCard[] = [];
  filteredCards: FilteredCard[] = [];
  recentUnlocks: CardCollectionEntry[] = [];

  // Filters
  selectedRarity: Rarity | 'all' = 'all';
  selectedDomain: Domain | 'all' = 'all';
  selectedStatus: 'all' | 'unlocked' | 'locked' = 'all';
  searchTerm = '';

  rarityOptions = [
    { label: 'Toutes les raretés', value: 'all' },
    { label: 'Commune', value: Rarity.Common },
    { label: 'Peu commune', value: Rarity.Uncommon },
    { label: 'Rare', value: Rarity.Rare },
    { label: 'Légendaire', value: Rarity.Legendary },
  ];

  domainOptions = [
    { label: 'Tous les domaines', value: 'all' },
    { label: 'IT', value: Domain.IT },
    { label: 'Police', value: Domain.Police },
    { label: 'Artisan', value: Domain.Crafts },
    { label: 'Enseignant', value: Domain.Teacher },
    { label: 'Urbanisme', value: Domain.UrbanPlanning },
    { label: 'Justice', value: Domain.Justice },
    { label: 'Santé', value: Domain.Health },
    { label: 'Finance', value: Domain.Finance },
  ];

  statusOptions = [
    { label: 'Toutes', value: 'all' },
    { label: 'Débloquées', value: 'unlocked' },
    { label: 'Verrouillées', value: 'locked' },
  ];

  constructor(
    private collectionService: CollectionService,
    private cardService: CardService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.loadCollection();
  }

  loadCollection(): void {
    // Get stats
    this.stats = this.collectionService.getCollectionStats();

    // Get all cards with collection status
    const allGameCards = this.cardService.getAllCards();
    const unlockedCards = this.collectionService.getUnlockedCards();
    const unlockedIds = new Set(unlockedCards.map(c => c.id));

    this.allCards = allGameCards.map(card => {
      const isUnlocked = unlockedIds.has(card.id);
      return {
        card,
        entry: {
          cardId: card.id,
          unlocked: isUnlocked,
          unlockCondition: this.getCardUnlockCondition(card),
        },
      };
    });

    // Get recent unlocks from stats
    this.recentUnlocks = this.stats.recentUnlocks;

    // Apply filters
    this.applyFilters();
  }

  private getCardUnlockCondition(card: Card): any {
    // This mirrors the logic from CollectionService
    if (card.cost <= 3 && card.rarity === Rarity.Common) {
      return { type: 'starter', requirement: 0, description: 'Carte de départ' };
    } else if (card.rarity === Rarity.Common) {
      return { type: 'games_played', requirement: 3, description: 'parties jouées' };
    } else if (card.rarity === Rarity.Uncommon) {
      return { type: 'games_played', requirement: 10, description: 'parties jouées' };
    } else if (card.rarity === Rarity.Rare) {
      const winsRequired = Math.max(5, Math.min(20, card.cost * 2));
      return { type: 'games_won', requirement: winsRequired, description: 'victoires' };
    } else {
      return { type: 'achievement', requirement: 'win_streak_5', description: 'Série de 5 victoires' };
    }
  }

  applyFilters(): void {
    this.filteredCards = this.allCards.filter(({ card, entry }) => {
      // Rarity filter
      if (this.selectedRarity !== 'all' && card.rarity !== this.selectedRarity) {
        return false;
      }

      // Domain filter
      if (this.selectedDomain !== 'all' && card.domain !== this.selectedDomain) {
        return false;
      }

      // Status filter
      if (this.selectedStatus === 'unlocked' && !entry.unlocked) {
        return false;
      }
      if (this.selectedStatus === 'locked' && entry.unlocked) {
        return false;
      }

      // Search filter
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        const nameMatch = card.name.toLowerCase().includes(term);
        return nameMatch;
      }

      return true;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  getProgressPercentage(entry: CardCollectionEntry): number {
    if (entry.unlocked) return 100;
    const condition = entry.unlockCondition;
    const stats = this.statsService.getPlayerStats();

    let currentProgress = 0;
    let requirement = 0;

    if (condition.type === 'games_played') {
      currentProgress = stats.totalGames;
      requirement = condition.requirement as number;
    } else if (condition.type === 'games_won') {
      currentProgress = stats.totalWins;
      requirement = condition.requirement as number;
    } else if (condition.type === 'achievement') {
      currentProgress = stats.longestWinStreak;
      requirement = 5; // win_streak_5
    } else {
      return 0;
    }

    if (requirement === 0) return 0;
    return Math.min(100, (currentProgress / requirement) * 100);
  }

  getProgressLabel(entry: CardCollectionEntry): string {
    if (entry.unlocked) return 'Débloquée';
    const condition = entry.unlockCondition;
    const stats = this.statsService.getPlayerStats();

    let currentProgress = 0;
    let requirement = 0;

    if (condition.type === 'games_played') {
      currentProgress = stats.totalGames;
      requirement = condition.requirement as number;
    } else if (condition.type === 'games_won') {
      currentProgress = stats.totalWins;
      requirement = condition.requirement as number;
    } else if (condition.type === 'achievement') {
      currentProgress = stats.longestWinStreak;
      requirement = 5;
    } else if (condition.type === 'starter') {
      return 'Débloquée au départ';
    } else {
      return 'Verrouillée';
    }

    return `${currentProgress}/${requirement} ${condition.description}`;
  }

  getRarityColor(rarity: Rarity | string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const r = typeof rarity === 'string' ? rarity : rarity;
    switch (r) {
      case Rarity.Common:
      case 'Common':
        return 'secondary';
      case Rarity.Uncommon:
      case 'Uncommon':
        return 'info';
      case Rarity.Rare:
      case 'Rare':
        return 'warn';
      case Rarity.Legendary:
      case 'Legendary':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getRarityLabel(rarity: Rarity): string {
    switch (rarity) {
      case Rarity.Common:
        return 'Commune';
      case Rarity.Uncommon:
        return 'Peu commune';
      case Rarity.Rare:
        return 'Rare';
      case Rarity.Legendary:
        return 'Légendaire';
      default:
        return rarity;
    }
  }

  getCardByEntry(entry: CardCollectionEntry): Card | undefined {
    return this.cardService.getCardById(entry.cardId);
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  resetFilters(): void {
    this.selectedRarity = 'all';
    this.selectedDomain = 'all';
    this.selectedStatus = 'all';
    this.searchTerm = '';
    this.applyFilters();
  }

  getRarityStats(rarityKey: string): { total: number; unlocked: number } {
    if (!this.stats) return { total: 0, unlocked: 0 };
    return this.stats.byRarity[rarityKey as Rarity];
  }
}
