import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslateModule } from '@ngx-translate/core'
import { MonacoEditorModule } from 'ngx-monaco-editor-v2'

import { ContainerRestartComponent } from '@/app/modules/platform-tools/docker/container-restart/container-restart.component'
import { DockerRoutingModule } from '@/app/modules/platform-tools/docker/docker-routing.module'
import { StartupScriptComponent } from '@/app/modules/platform-tools/docker/startup-script/startup-script.component'
import { StartupScriptResolver } from '@/app/modules/platform-tools/docker/startup-script/startup-script.resolver'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MonacoEditorModule,
    NgbModule,
    TranslateModule.forChild(),
    DockerRoutingModule,
    StartupScriptComponent,
    ContainerRestartComponent,
  ],
  providers: [
    StartupScriptResolver,
  ],
})
export class DockerModule {}
