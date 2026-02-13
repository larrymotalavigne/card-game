import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-turn-transition',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './turn-transition.component.html',
  styleUrl: './turn-transition.component.scss',
})
export class TurnTransitionComponent implements OnInit {
  @Input({ required: true }) playerName!: string;
  @Input({ required: true }) turnNumber!: number;
  @Output() dismiss = new EventEmitter<void>();

  ready = false;
  countdown = 2;

  ngOnInit(): void {
    const timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.ready = true;
        clearInterval(timer);
      }
    }, 1000);
  }
}
