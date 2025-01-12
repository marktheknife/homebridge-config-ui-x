import { NgClass } from '@angular/common'
import { Component, Input } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { InlineSVGModule } from 'ng-inline-svg-2'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'

@Component({
  selector: 'app-occupancysensor',
  templateUrl: './occupancysensor.component.html',
  styleUrls: ['./occupancysensor.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    InlineSVGModule,
    TranslatePipe,
  ],
})
export class OccupancysensorComponent {
  @Input() public service: ServiceTypeX

  constructor() {}

  onClick() {
    // eslint-disable-next-line no-console
    console.log('short click')
  }

  onLongClick() {
    // eslint-disable-next-line no-console
    console.log('long clicked')
  }
}
