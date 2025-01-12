import { Component, inject, Input, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'
import { NouisliderComponent } from 'ng2-nouislider'
import { Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'

@Component({
  selector: 'app-fan-manage',
  templateUrl: './fan.manage.component.html',
  standalone: true,
  imports: [
    FormsModule,
    NouisliderComponent,
    TranslatePipe,
  ],
})
export class FanManageComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)

  @Input() public service: ServiceTypeX
  public targetMode: any
  public targetRotationSpeed: any
  public targetRotationSpeedChanged: Subject<string> = new Subject<string>()

  constructor() {
    this.targetRotationSpeedChanged
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
      )
      .subscribe(() => {
        this.service.getCharacteristic('RotationSpeed').setValue(this.targetRotationSpeed.value)

        // Turn bulb on or off when brightness is adjusted
        if (this.targetRotationSpeed.value && !this.service.values.On) {
          this.targetMode = true
          this.service.getCharacteristic('On').setValue(this.targetMode)
        } else if (!this.targetRotationSpeed.value && this.service.values.On) {
          this.targetMode = false
          this.service.getCharacteristic('On').setValue(this.targetMode)
        }
      })
  }

  ngOnInit() {
    this.targetMode = this.service.values.On

    this.loadRotationSpeed()
  }

  loadRotationSpeed() {
    const RotationSpeed = this.service.getCharacteristic('RotationSpeed')

    if (RotationSpeed) {
      this.targetRotationSpeed = {
        value: RotationSpeed.value,
        min: RotationSpeed.minValue,
        max: RotationSpeed.maxValue,
        step: RotationSpeed.minStep,
        unit: RotationSpeed.unit,
      }
    }
  }

  setTargetMode(value: boolean) {
    this.targetMode = value
    this.service.getCharacteristic('On').setValue(this.targetMode)

    // Set the rotation speed to max if on 0% when turned on
    if (this.targetMode && this.targetRotationSpeed && !this.targetRotationSpeed.value) {
      this.targetRotationSpeed.value = this.service.getCharacteristic('RotationSpeed').maxValue
    }
  }

  onTargetRotationSpeedChange() {
    this.targetRotationSpeedChanged.next(this.targetRotationSpeed.value)
  }
}
