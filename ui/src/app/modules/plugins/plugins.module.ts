import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslateModule } from '@ngx-translate/core'

import { ManagePluginsModule } from '@/app/core/manage-plugins/manage-plugins.module'
import { PluginCardComponent } from '@/app/modules/plugins/plugin-card/plugin-card.component'
import { PluginInfoComponent } from '@/app/modules/plugins/plugin-card/plugin-info/plugin-info.component'
import { PluginsRoutingModule } from '@/app/modules/plugins/plugins-routing.module'
import { PluginsComponent } from '@/app/modules/plugins/plugins.component'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule.forChild(),
    NgbModule,
    ManagePluginsModule,
    PluginsRoutingModule,
    PluginsComponent,
    PluginCardComponent,
    PluginInfoComponent,
  ],
})
export class PluginsModule {}
