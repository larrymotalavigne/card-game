import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../card/card.component';
import { CardInstance, detectKeywords } from '../../../models/game.model';
import { GameService } from '../../../services/game.service';
import { isJobCard } from '../../../models/card.model';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
})
export class GameCardComponent {
  @Input({ required: true }) instance!: CardInstance;
  @Input() selectable = false;
  @Input() selected = false;
  @Input() faceDown = false;
  @Input() affordable = false;
  @Input() showStats = true;
  @Input() justPlayed = false;
  @Output() cardClick = new EventEmitter<string>();

  constructor(private gameService: GameService) {}

  get isJob(): boolean {
    return isJobCard(this.instance.card);
  }

  get effectiveProductivity(): number {
    return this.gameService.getEffectiveProductivity(this.instance);
  }

  get effectiveResilience(): number {
    return this.gameService.getEffectiveResilience(this.instance);
  }

  get isAttacking(): boolean {
    return this.gameService.isAttacking(this.instance.instanceId);
  }

  get isBlocking(): boolean {
    return this.gameService.isBlocking(this.instance.instanceId);
  }

  get keywords(): string[] {
    const text = this.getAbilityText();
    return detectKeywords(text);
  }

  get hasModifiers(): boolean {
    return this.instance.modifiers.length > 0 || this.instance.constructionBonuses > 0;
  }

  onClick(): void {
    this.cardClick.emit(this.instance.instanceId);
  }

  private getAbilityText(): string {
    const card = this.instance.card as any;
    return card.ability ?? card.effect ?? '';
  }
}
