import { DecimalPipe, NgClass } from '@angular/common'
import { Component, inject, Input } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'
import { ThermostatManageComponent } from '@/app/core/accessories/types/thermostat/thermostat.manage.component'
import { LongClickDirective } from '@/app/core/directives/longclick.directive'
import { ConvertTempPipe } from '@/app/core/pipes/convert-temp.pipe'

@Component({
  selector: 'app-thermostat',
  templateUrl: './thermostat.component.html',
  styleUrls: ['./thermostat.component.scss'],
  standalone: true,
  imports: [
    LongClickDirective,
    NgClass,
    DecimalPipe,
    TranslatePipe,
    ConvertTempPipe,
  ],
})
export class ThermostatComponent {
  private $modal = inject(NgbModal)

  @Input() public service: ServiceTypeX
  model = 1

  constructor() {}

  onClick() {
    const ref = this.$modal.open(ThermostatManageComponent, {
      size: 'sm',
    })
    ref.componentInstance.service = this.service
  }
}
