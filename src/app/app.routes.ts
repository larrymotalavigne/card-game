import { Routes } from '@angular/router';
import { CardGalleryComponent } from './components/card-gallery/card-gallery.component';
import { PrintSheetComponent } from './components/print-sheet/print-sheet.component';
import { RulesComponent } from './components/rules/rules.component';
import { DeckBuilderComponent } from './components/deck-builder/deck-builder.component';
import { GameLobbyComponent } from './components/game/game-lobby/game-lobby.component';
import { GameBoardComponent } from './components/game/game-board/game-board.component';
import { gameGuard } from './guards/game.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'gallery', pathMatch: 'full' },
  { path: 'gallery', component: CardGalleryComponent },
  { path: 'deck-builder', component: DeckBuilderComponent },
  { path: 'deck-builder/:deckId', component: DeckBuilderComponent },
  { path: 'print', component: PrintSheetComponent },
  { path: 'rules', component: RulesComponent },
  { path: 'game', component: GameLobbyComponent },
  { path: 'game/play', component: GameBoardComponent, canActivate: [gameGuard], data: { hideNav: true } },
];
