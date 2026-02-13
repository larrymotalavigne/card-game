import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { GameState, CardZone, CardInstance } from '../../../models/game.model';
import { GameService } from '../../../services/game.service';

@Component({
  selector: 'app-manual-actions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    Dialog,
    InputNumber,
    Select,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
  ],
  templateUrl: './manual-actions.component.html',
  styleUrl: './manual-actions.component.scss',
})
export class ManualActionsComponent {
  @Input({ required: true }) state!: GameState;

  visible = false;
  repDelta = 0;
  budgetDelta = 0;
  drawCount = 1;
  selectedPlayerId = '';
  modProd = 0;
  modRes = 0;
  modDesc = '';
  modPermanent = false;
  selectedCardId = '';
  targetZone: CardZone = CardZone.Hand;

  zoneOptions = [
    { label: 'Main', value: CardZone.Hand },
    { label: 'Terrain', value: CardZone.Field },
    { label: 'Cimetière', value: CardZone.Graveyard },
    { label: 'Deck', value: CardZone.Deck },
  ];

  constructor(private gameService: GameService) {}

  get playerOptions() {
    return [
      { label: this.state.player1.name, value: this.state.player1.id },
      { label: this.state.player2.name, value: this.state.player2.id },
    ];
  }

  get allFieldCards(): { label: string; value: string }[] {
    const cards: { label: string; value: string }[] = [];
    for (const p of [this.state.player1, this.state.player2]) {
      for (const c of p.field) {
        cards.push({ label: `${c.card.name} (${p.name})`, value: c.instanceId });
      }
    }
    return cards;
  }

  get allCards(): { label: string; value: string }[] {
    const cards: { label: string; value: string }[] = [];
    for (const p of [this.state.player1, this.state.player2]) {
      for (const zone of [p.hand, p.field, p.graveyard]) {
        for (const c of zone) {
          cards.push({ label: `${c.card.name} (${p.name}, ${c.zone})`, value: c.instanceId });
        }
      }
    }
    return cards;
  }

  open(): void {
    this.selectedPlayerId = this.state.activePlayerId;
    this.visible = true;
  }

  adjustReputation(delta: number): void {
    if (!this.selectedPlayerId) return;
    this.gameService.adjustReputation(this.selectedPlayerId, delta);
  }

  adjustBudget(delta: number): void {
    if (!this.selectedPlayerId) return;
    this.gameService.adjustBudget(this.selectedPlayerId, delta);
  }

  drawCards(): void {
    if (!this.selectedPlayerId || this.drawCount < 1) return;
    this.gameService.drawExtraCards(this.selectedPlayerId, this.drawCount);
  }

  moveCard(): void {
    if (!this.selectedCardId) return;
    this.gameService.moveCard(this.selectedCardId, this.targetZone);
  }

  addModifier(): void {
    if (!this.selectedCardId || !this.modDesc) return;
    this.gameService.addModifier(this.selectedCardId, {
      productivityDelta: this.modProd,
      resilienceDelta: this.modRes,
      description: this.modDesc,
      permanent: this.modPermanent,
    });
    this.modProd = 0;
    this.modRes = 0;
    this.modDesc = '';
  }

  shuffleDeck(): void {
    if (!this.selectedPlayerId) return;
    this.gameService.shuffleDeck(this.selectedPlayerId);
  }

  destroyCard(): void {
    if (!this.selectedCardId) return;
    this.gameService.destroyCardManual(this.selectedCardId);
  }
}
