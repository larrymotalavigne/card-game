import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { GameState, GamePhase, CardInstance } from '../../../models/game.model';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameService } from '../../../services/game.service';

@Component({
  selector: 'app-mulligan-overlay',
  standalone: true,
  imports: [CommonModule, Button, GameCardComponent],
  templateUrl: './mulligan-overlay.component.html',
  styleUrl: './mulligan-overlay.component.scss',
})
export class MulliganOverlayComponent {
  @Input({ required: true }) state!: GameState;

  selectedCards = new Set<string>();
  showTransition = false;
  private firstPlayerDone = false;

  constructor(private gameService: GameService) {}

  get currentPlayer() {
    // Player 1 goes first in mulligan, then player 2
    if (!this.state.player1.mulliganUsed) return this.state.player1;
    return this.state.player2;
  }

  get currentHand(): CardInstance[] {
    return this.currentPlayer.hand;
  }

  get waitingForSecondPlayer(): boolean {
    return this.showTransition;
  }

  get nextPlayerName(): string {
    return this.state.player2.name;
  }

  isSelected(instanceId: string): boolean {
    return this.selectedCards.has(instanceId);
  }

  toggleCard(instanceId: string): void {
    if (this.selectedCards.has(instanceId)) {
      this.selectedCards.delete(instanceId);
    } else {
      this.selectedCards.add(instanceId);
    }
  }

  keepHand(): void {
    this.submitMulligan([]);
  }

  replaceCards(): void {
    this.submitMulligan([...this.selectedCards]);
  }

  private submitMulligan(cardIds: string[]): void {
    const playerId = this.currentPlayer.id;
    const isFirstPlayer = !this.firstPlayerDone;

    this.gameService.mulligan(playerId, cardIds);
    this.selectedCards.clear();

    if (isFirstPlayer && !this.state.player2.mulliganUsed) {
      this.firstPlayerDone = true;
      this.showTransition = true;
    }
  }

  dismissTransition(): void {
    this.showTransition = false;
  }
}
