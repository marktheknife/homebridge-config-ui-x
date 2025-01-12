import { TitleCasePipe } from '@angular/common'
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core'
import { JwtHelperService } from '@auth0/angular-jwt'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { NgxMdModule } from 'ngx-md'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom } from 'rxjs'

/* global NodeJS */
import { ApiService } from '@/app/core/api.service'
import { SchemaFormComponent } from '@/app/core/components/schema-form/schema-form.component'
import { PluginsMarkdownDirective } from '@/app/core/directives/plugins.markdown.directive'
import { SettingsService } from '@/app/core/settings.service'

@Component({
  selector: 'app-homebridge-google-smarthome',
  templateUrl: './homebridge-google-smarthome.component.html',
  standalone: true,
  imports: [
    NgxMdModule,
    PluginsMarkdownDirective,
    SchemaFormComponent,
    TitleCasePipe,
    TranslatePipe,
  ],
})
export class HomebridgeGoogleSmarthomeComponent implements OnInit, OnDestroy {
  $activeModal = inject(NgbActiveModal)
  private $api = inject(ApiService)
  private $jwtHelper = inject(JwtHelperService)
  $settings = inject(SettingsService)
  private $toastr = inject(ToastrService)
  private $translate = inject(TranslateService)

  @Input() public plugin: any
  @Input() public schema: any
  @Input() pluginConfig: Record<string, any>[]

  public justLinked = false
  public gshConfig: Record<string, any>
  public linkType: string
  public readonly linkInsecure = '<a href="https://github.com/homebridge/homebridge-config-ui-x/wiki/Enabling-Accessory-Control" target="_blank"><i class="fa fa-fw fa-external-link-alt"></i></a>'

  private linkDomain = 'https://homebridge-gsh.iot.oz.nu'
  private linkUrl = `${this.linkDomain}/link-account`
  private popup: Window
  private originCheckInterval: NodeJS.Timeout

  constructor() {
    // Listen for sign in events from the link account popup
    window.addEventListener('message', this.windowMessageListener, false)
  }

  ngOnInit() {
    if (!this.pluginConfig.length) {
      this.pluginConfig.push({ name: 'Google Smart Home', platform: this.schema.pluginAlias })
    }

    this.gshConfig = this.pluginConfig[0]

    this.parseToken()
  }

  windowMessageListener = (e: MessageEvent) => {
    if (e.origin !== this.linkDomain) {
      console.error('Refusing to process message from', e.origin)
      console.error(e)
    }

    try {
      const data = JSON.parse(e.data)
      if (data.token) {
        this.processToken(data.token)
      }
    } catch (error) {
      console.error(error)
    }
  }

  linkAccount() {
    const w = 450
    const h = 700
    const y = window.top.outerHeight / 2 + window.top.screenY - (h / 2)
    const x = window.top.outerWidth / 2 + window.top.screenX - (w / 2)
    this.popup = window.open(
      this.linkUrl,
      'oznu-google-smart-home-auth',
      'toolbar=no, location=no, directories=no, status=no, menubar=no scrollbars=no, resizable=no, copyhistory=no, '
      + `width=${w}, height=${h}, top=${y}, left=${x}`,
    )

    // Simple message popup to provide the current hostname
    this.originCheckInterval = setInterval(() => {
      this.popup.postMessage('origin-check', this.linkDomain)
    }, 2000)
  }

  unlinkAccount() {
    this.gshConfig = {
      name: 'Google Smart Home',
      platform: this.schema.pluginAlias,
    }

    this.pluginConfig.splice(0, this.pluginConfig.length)
    this.saveConfig()
  }

  processToken(token: string) {
    clearInterval(this.originCheckInterval)
    if (this.popup) {
      this.popup.close()
    }
    this.gshConfig.token = token
    this.gshConfig.notice = 'Keep your token a secret!'

    if (!this.pluginConfig.length) {
      this.pluginConfig.push(this.gshConfig)
    }

    this.parseToken()
    this.saveConfig()
  }

  parseToken() {
    if (this.gshConfig.token) {
      try {
        const decoded = this.$jwtHelper.decodeToken(this.gshConfig.token)
        this.linkType = decoded.id.split('|')[0].split('-')[0]
      } catch (error) {
        console.error(error)
        this.$toastr.error(this.$translate.instant('plugins.settings.custom.homebridge-gsh.message_invalid_token'), this.$translate.instant('toast.title_error'))
        delete this.gshConfig.token
      }
    }
  }

  async saveConfig() {
    try {
      await firstValueFrom(this.$api.post(`/config-editor/plugin/${encodeURIComponent(this.plugin.name)}`, this.pluginConfig))
      this.justLinked = true
      this.$toastr.success(
        this.$translate.instant('plugins.settings.restart_required'),
        this.$translate.instant('plugins.settings.plugin_config_saved'),
      )
    } catch (error) {
      console.error(error)
      this.$toastr.error(this.$translate.instant('config.failed_to_save_config'), this.$translate.instant('toast.title_error'))
    }
  }

  async saveAndClose() {
    this.gshConfig.platform = this.schema.pluginAlias
    this.pluginConfig[0] = this.gshConfig

    await this.saveConfig()
    this.$activeModal.close()
  }

  close() {
    this.$activeModal.close()
  }

  ngOnDestroy() {
    clearInterval(this.originCheckInterval)
    window.removeEventListener('message', this.windowMessageListener)
    if (this.popup) {
      this.popup.close()
    }
  }
}
