import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { Card as PCard } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { DeckService } from '../../../services/deck.service';
import { GameService } from '../../../services/game.service';
import { TutorialService } from '../../../services/tutorial.service';
import { Deck, DeckValidation, StarterDeck } from '../../../models/deck.model';

interface DeckOption {
  label: string;
  value: string;
  totalCards: number;
}

interface DeckGroup {
  label: string;
  items: DeckOption[];
}

@Component({
  selector: 'app-game-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, InputText, Select, Button, PCard, Tag, RouterLink],
  templateUrl: './game-lobby.component.html',
  styleUrl: './game-lobby.component.scss',
})
export class GameLobbyComponent implements OnInit {
  p1Name = 'Joueur 1';
  p2Name = 'Joueur 2';
  p1DeckId = '';
  p2DeckId = '';
  deckOptions: DeckGroup[] = [];
  starterDecks: StarterDeck[] = [];
  p1Validation: DeckValidation | null = null;
  p2Validation: DeckValidation | null = null;

  constructor(
    private deckService: DeckService,
    private gameService: GameService,
    private tutorialService: TutorialService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDecks();
  }

  private loadDecks(): void {
    this.starterDecks = this.deckService.getStarterDecks();

    const starterItems: DeckOption[] = this.starterDecks.map(s => {
      const total = s.entries.reduce((sum, e) => sum + e.quantity, 0);
      return { label: `${s.name} (${total} cartes)`, value: s.id, totalCards: total };
    });

    const userDecks = this.deckService.getAllDecks();
    const userItems: DeckOption[] = userDecks.map(d => {
      const total = d.entries.reduce((sum, e) => sum + e.quantity, 0);
      return { label: `${d.name} (${total} cartes)`, value: d.id, totalCards: total };
    });

    this.deckOptions = [];
    if (starterItems.length > 0) {
      this.deckOptions.push({ label: 'Decks Prédéfinis', items: starterItems });
    }
    if (userItems.length > 0) {
      this.deckOptions.push({ label: 'Mes Decks', items: userItems });
    }
  }

  onP1DeckChange(): void {
    if (this.p1DeckId) {
      const deck = this.deckService.getDeckById(this.p1DeckId);
      this.p1Validation = deck ? this.deckService.validateDeck(deck) : null;
    } else {
      this.p1Validation = null;
    }
  }

  onP2DeckChange(): void {
    if (this.p2DeckId) {
      const deck = this.deckService.getDeckById(this.p2DeckId);
      this.p2Validation = deck ? this.deckService.validateDeck(deck) : null;
    } else {
      this.p2Validation = null;
    }
  }

  get canStart(): boolean {
    return !!(this.p1DeckId && this.p2DeckId && this.p1Validation?.isValid && this.p2Validation?.isValid);
  }

  startGame(): void {
    if (!this.canStart) return;
    this.gameService.startGame(
      this.p1Name || 'Joueur 1',
      this.p1DeckId,
      this.p2Name || 'Joueur 2',
      this.p2DeckId,
    );
    this.router.navigate(['/game/play']);
  }

  startQuickGame(): void {
    this.gameService.startQuickGame(
      this.p1Name || 'Joueur 1',
      this.p2Name || 'Joueur 2',
    );
    this.router.navigate(['/game/play']);
  }

  startAiGame(): void {
    const starters = this.deckService.getStarterDecks();
    const aiDeck = starters[Math.floor(Math.random() * starters.length)];
    if (this.p1DeckId && this.p1Validation?.isValid) {
      this.gameService.startAiGame(this.p1Name || 'Joueur 1', this.p1DeckId, aiDeck.id);
    } else {
      this.gameService.startQuickAiGame(this.p1Name || 'Joueur 1');
    }
    this.router.navigate(['/game/play']);
  }

  startTutorial(): void {
    // Use Cyber Assault starter deck — guaranteed multiple 1-cost cards
    this.gameService.startGame('Vous', 'starter-cyber-assault', 'Adversaire', 'starter-cyber-assault');
    // Auto-complete mulligan for both players so tutorial skips to Budget
    this.gameService.mulligan('player1', []);
    this.gameService.mulligan('player2', []);
    this.tutorialService.start();
    this.router.navigate(['/game/play']);
  }

  selectStarterDeck(deckId: string, player: 1 | 2): void {
    if (player === 1) {
      this.p1DeckId = deckId;
      this.onP1DeckChange();
    } else {
      this.p2DeckId = deckId;
      this.onP2DeckChange();
    }
  }
}
