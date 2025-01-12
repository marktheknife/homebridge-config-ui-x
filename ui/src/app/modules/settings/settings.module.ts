import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslateModule } from '@ngx-translate/core'

import { BackupComponent } from '@/app/modules/settings/backup/backup.component'
import { RestoreComponent } from '@/app/modules/settings/backup/restore/restore.component'
import { RemoveAllAccessoriesComponent } from '@/app/modules/settings/remove-all-accessories/remove-all-accessories.component'
import { RemoveBridgeAccessoriesComponent } from '@/app/modules/settings/remove-bridge-accessories/remove-bridge-accessories.component'
import { RemoveIndividualAccessoriesComponent } from '@/app/modules/settings/remove-individual-accessories/remove-individual-accessories.component'
import { ResetAllBridgesComponent } from '@/app/modules/settings/reset-all-bridges/reset-all-bridges.component'
import { ResetIndividualBridgesComponent } from '@/app/modules/settings/reset-individual-bridges/reset-individual-bridges.component'
import { SelectNetworkInterfacesComponent } from '@/app/modules/settings/select-network-interfaces/select-network-interfaces.component'
import { SettingsRoutingModule } from '@/app/modules/settings/settings-routing.module'
import { SettingsComponent } from '@/app/modules/settings/settings.component'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgbModule,
    SettingsRoutingModule,
    SettingsComponent,
    ResetAllBridgesComponent,
    ResetIndividualBridgesComponent,
    RemoveAllAccessoriesComponent,
    RemoveIndividualAccessoriesComponent,
    RemoveBridgeAccessoriesComponent,
    SelectNetworkInterfacesComponent,
    RestoreComponent,
    BackupComponent,
  ],
})
export class SettingsModule {}
