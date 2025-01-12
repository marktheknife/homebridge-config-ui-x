import { NgClass } from '@angular/common'
import { Component, Input, OnInit } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { InlineSVGModule } from 'ng-inline-svg-2'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'
import { LongClickDirective } from '@/app/core/directives/longclick.directive'

@Component({
  selector: 'app-television',
  templateUrl: './television.component.html',
  standalone: true,
  imports: [
    LongClickDirective,
    NgClass,
    InlineSVGModule,
    TranslatePipe,
  ],
})
export class TelevisionComponent implements OnInit {
  @Input() public service: ServiceTypeX
  public channelList = {}

  constructor() {}

  ngOnInit() {
    // Build inputService list
    for (const [, inputService] of Object.entries(this.service.linkedServices)) {
      this.channelList[inputService.values.Identifier] = inputService.values.ConfiguredName
    }
  }

  onClick() {
    this.service.getCharacteristic('Active').setValue(this.service.values.Active ? 0 : 1)
  }
}
