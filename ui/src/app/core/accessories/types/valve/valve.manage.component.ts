import { Component, inject, Input, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'

@Component({
  selector: 'app-valve-manage',
  templateUrl: './valve.manage.component.html',
  styleUrls: ['./valve.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
  ],
})
export class ValveManageComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)

  @Input() public service: ServiceTypeX
  public availableSetDurations = []
  public targetSetDuration: number

  private durationSeconds = [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300, 3600]

  constructor() {}

  ngOnInit() {
    this.targetSetDuration = this.service.values.SetDuration

    if (!this.durationSeconds.includes(this.targetSetDuration)) {
      this.durationSeconds.unshift(this.targetSetDuration)
    }

    this.availableSetDurations = this.durationSeconds.map((seconds) => {
      const label = seconds < 3600
        ? new Date(seconds * 1000).toISOString().substring(14, 19)
        : new Date(seconds * 1000).toISOString().substring(11, 19)
      return { seconds, label }
    })
  }

  onSetDurationChange() {
    this.service.getCharacteristic('SetDuration').setValue(this.targetSetDuration)
  }
}
