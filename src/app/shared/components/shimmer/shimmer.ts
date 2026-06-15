import { Component, input } from '@angular/core';

@Component({
  selector: 'app-shimmer',
  imports: [],
  templateUrl: './shimmer.html',
})
export class Shimmer {
  type = input<'table' | 'card' | 'form'>('table');
  rows = input<number>(5);

  get rowArray() {
    return Array(this.rows());
  }
}