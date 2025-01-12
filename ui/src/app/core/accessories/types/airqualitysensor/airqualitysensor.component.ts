import { NgClass } from '@angular/common'
import { Component, Input } from '@angular/core'
import { InlineSVGModule } from 'ng-inline-svg-2'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'

@Component({
  selector: 'app-airqualitysensor',
  templateUrl: './airqualitysensor.component.html',
  standalone: true,
  imports: [NgClass, InlineSVGModule],
})
export class AirqualitysensorComponent {
  @Input() public service: ServiceTypeX

  public labels = ['Unknown', 'Excellent', 'Good', 'Fair', 'Inferior', 'Poor']

  constructor() {}
}
