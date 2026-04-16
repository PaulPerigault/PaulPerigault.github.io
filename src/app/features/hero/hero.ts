import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'pp-hero',
  imports: [TranslatePipe],
  templateUrl: './hero.html',
})
export class Hero {}
