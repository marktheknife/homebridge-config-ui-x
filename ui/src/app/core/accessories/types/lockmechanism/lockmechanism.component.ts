import { NgClass } from '@angular/common'
import { Component, Input } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { InlineSVGModule } from 'ng-inline-svg-2'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'
import { LongClickDirective } from '@/app/core/directives/longclick.directive'

@Component({
  selector: 'app-lockmechanism',
  templateUrl: './lockmechanism.component.html',
  standalone: true,
  imports: [
    LongClickDirective,
    NgClass,
    InlineSVGModule,
    TranslatePipe,
  ],
})
export class LockmechanismComponent {
  @Input() public service: ServiceTypeX

  constructor() {}

  onClick() {
    this.service.getCharacteristic('LockTargetState').setValue(this.service.values.LockTargetState ? 0 : 1)
  }
}
