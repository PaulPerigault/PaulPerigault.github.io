import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'pp-about',
  imports: [TranslatePipe],
  templateUrl: './about.html',
})
export class About {}
