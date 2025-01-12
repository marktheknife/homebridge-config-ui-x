import { Component, inject, Input, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

import { ServiceTypeX } from '@/app/core/accessories/accessories.interfaces'

@Component({
  selector: 'app-securitysystem.manage',
  templateUrl: './securitysystem.manage.component.html',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
})
export class SecuritysystemManageComponent implements OnInit {
  $activeModal = inject(NgbActiveModal)

  @Input() public service: ServiceTypeX
  public targetMode: any

  constructor() {}

  ngOnInit() {
    this.targetMode = this.service.values.SecuritySystemTargetState
  }

  setTargetMode(value: number) {
    this.targetMode = value
    this.service.getCharacteristic('SecuritySystemTargetState').setValue(this.targetMode)
  }
}
