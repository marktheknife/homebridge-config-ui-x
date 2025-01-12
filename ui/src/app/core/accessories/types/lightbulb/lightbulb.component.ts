import { NgClass } from '@angular/common'
import { Component, inject, Input } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'
import { InlineSVGModule } from 'ng-inline-svg-2'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'
import { LightbulbManageComponent } from '@/app/core/accessories/types//lightbulb/lightbulb.manage.component'
import { LongClickDirective } from '@/app/core/directives/longclick.directive'

@Component({
  selector: 'app-lightbulb',
  templateUrl: './lightbulb.component.html',
  standalone: true,
  imports: [
    LongClickDirective,
    NgClass,
    InlineSVGModule,
    TranslatePipe,
  ],
})
export class LightbulbComponent {
  private $modal = inject(NgbModal)

  @Input() public service: ServiceTypeX

  constructor() {}

  onClick() {
    this.service.getCharacteristic('On').setValue(!this.service.values.On)

    // Set the brightness to 100% if on 0% when turned on
    if (!this.service.values.On && 'Brightness' in this.service.values && !this.service.values.Brightness) {
      this.service.getCharacteristic('Brightness').setValue(100)
    }
  }

  onLongClick() {
    if ('Brightness' in this.service.values) {
      const ref = this.$modal.open(LightbulbManageComponent, {
        size: 'md',
      })
      ref.componentInstance.service = this.service
    }
  }
}
