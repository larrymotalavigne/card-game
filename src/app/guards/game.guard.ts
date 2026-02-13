import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameService } from '../services/game.service';

export const gameGuard: CanActivateFn = () => {
  const gameService = inject(GameService);
  const router = inject(Router);

  if (gameService.state) {
    return true;
  }

  return router.createUrlTree(['/game']);
};
