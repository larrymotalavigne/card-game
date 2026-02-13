import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../../services/game.service';
import { GameState, GamePhase } from '../../../models/game.model';
import { TutorialService } from '../../../services/tutorial.service';
import { PhaseBarComponent } from '../phase-bar/phase-bar.component';
import { PlayerAreaComponent } from '../player-area/player-area.component';
import { TurnTransitionComponent } from '../turn-transition/turn-transition.component';
import { CombatOverlayComponent } from '../combat-overlay/combat-overlay.component';
import { MulliganOverlayComponent } from '../mulligan-overlay/mulligan-overlay.component';
import { TargetingOverlayComponent } from '../targeting-overlay/targeting-overlay.component';
import { TutorialOverlayComponent } from '../tutorial-overlay/tutorial-overlay.component';
import { GameLogComponent } from '../game-log/game-log.component';
import { ManualActionsComponent } from '../manual-actions/manual-actions.component';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [
    CommonModule,
    PhaseBarComponent,
    PlayerAreaComponent,
    TurnTransitionComponent,
    CombatOverlayComponent,
    MulliganOverlayComponent,
    TargetingOverlayComponent,
    TutorialOverlayComponent,
    GameLogComponent,
    ManualActionsComponent,
    Button,
    Dialog,
  ],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss',
})
export class GameBoardComponent implements OnInit, OnDestroy {
  state: GameState | null = null;
  showTransition = false;
  showLog = false;
  showVictory = false;
  private previousActivePlayer = '';
  private sub!: Subscription;

  constructor(
    public gameService: GameService,
    public tutorialService: TutorialService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.sub = this.gameService.gameState$.subscribe(state => {
      if (!state) return;

      // Detect player switch for transition
      if (this.previousActivePlayer && this.previousActivePlayer !== state.activePlayerId) {
        this.showTransition = true;
      }
      this.previousActivePlayer = state.activePlayerId;

      // Detect victory
      if (state.winner && !this.showVictory) {
        this.showVictory = true;
      }

      // Notify tutorial of phase changes
      this.tutorialService.onPhaseChange(state.phase);

      this.state = state;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.showTransition || this.showVictory) return;
    if (this.state?.phase === GamePhase.Mulligan) return;
    if (this.state?.pendingEffect) return;
    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      this.gameService.advancePhase();
    }
  }

  get isMulliganPhase(): boolean {
    return this.state?.phase === GamePhase.Mulligan || false;
  }

  onTransitionDismiss(): void {
    this.showTransition = false;
  }

  toggleLog(): void {
    this.showLog = !this.showLog;
  }

  getWinnerName(): string {
    if (!this.state?.winner) return '';
    return this.state.winner === this.state.player1.id
      ? this.state.player1.name
      : this.state.player2.name;
  }

  exitGame(): void {
    this.gameService.endGame();
    this.router.navigate(['/game']);
  }

  get showCombatOverlay(): boolean {
    return !!this.state?.combat && (
      this.state.phase === GamePhase.Work_Attack ||
      this.state.phase === GamePhase.Work_Block ||
      this.state.phase === GamePhase.Work_Damage
    );
  }
}
