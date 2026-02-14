import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { Toast } from 'primeng/toast';
import { filter, map } from 'rxjs';
import { CollectionService } from './services/collection.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Menubar, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {
  hideNav = false;

  menuItems: MenuItem[] = [
    { label: 'Galerie', icon: 'pi pi-th-large', routerLink: '/gallery' },
    { label: 'Collection', icon: 'pi pi-star', routerLink: '/collection' },
    { label: 'Constructeur', icon: 'pi pi-objects-column', routerLink: '/deck-builder' },
    { label: 'Jouer', icon: 'pi pi-play', routerLink: '/game' },
    { label: 'Statistiques', icon: 'pi pi-chart-line', routerLink: '/stats' },
    { label: 'Imprimer', icon: 'pi pi-print', routerLink: '/print' },
    { label: 'Règles', icon: 'pi pi-book', routerLink: '/rules' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private collectionService: CollectionService
  ) {
    // Initialize collection on first launch
    this.collectionService.initializeCollection();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => {
        let r = this.route;
        while (r.firstChild) r = r.firstChild;
        return r.snapshot.data;
      }),
    ).subscribe(data => {
      this.hideNav = !!data['hideNav'];
    });
  }
}
