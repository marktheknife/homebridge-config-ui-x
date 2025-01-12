import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { TerminalRoutingModule } from '@/app/modules/platform-tools/terminal/terminal-routing.module'
import { TerminalComponent } from '@/app/modules/platform-tools/terminal/terminal.component'

@NgModule({
  imports: [
    CommonModule,
    TerminalRoutingModule,
    TranslateModule.forChild(),
    TerminalComponent,
  ],
})
export class TerminalModule {}
