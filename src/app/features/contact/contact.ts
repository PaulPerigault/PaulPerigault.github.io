import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'pp-contact',
  imports: [TranslatePipe],
  templateUrl: './contact.html',
})
export class Contact {}
