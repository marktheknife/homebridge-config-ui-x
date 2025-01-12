import { NgClass } from '@angular/common'
import { Component, Input } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { InlineSVGModule } from 'ng-inline-svg-2'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'

@Component({
  selector: 'app-smokesensor',
  templateUrl: './smokesensor.component.html',
  styleUrls: ['./smokesensor.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    InlineSVGModule,
    TranslatePipe,
  ],
})
export class SmokesensorComponent {
  @Input() public service: ServiceTypeX

  constructor() {}
}
