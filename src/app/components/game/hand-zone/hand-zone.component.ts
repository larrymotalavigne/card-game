import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardInstance, GameState, GamePhase } from '../../../models/game.model';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameService } from '../../../services/game.service';
import { TutorialService } from '../../../services/tutorial.service';

@Component({
  selector: 'app-hand-zone',
  standalone: true,
  imports: [CommonModule, GameCardComponent],
  templateUrl: './hand-zone.component.html',
  styleUrl: './hand-zone.component.scss',
})
export class HandZoneComponent {
  @Input({ required: true }) cards!: CardInstance[];
  @Input() isActive = false;
  @Input({ required: true }) state!: GameState;

  constructor(
    private gameService: GameService,
    private tutorialService: TutorialService,
  ) {}

  get isHiringPhase(): boolean {
    return this.state.phase === GamePhase.Hiring && this.isActive;
  }

  isAffordable(card: CardInstance): boolean {
    if (!this.isHiringPhase) return false;
    return this.gameService.canPlayCard(card.instanceId);
  }

  onCardClick(instanceId: string): void {
    if (!this.isHiringPhase) return;
    if (!this.gameService.canPlayCard(instanceId)) return;
    this.gameService.playCard(instanceId);
    this.tutorialService.onAction();
  }
}
