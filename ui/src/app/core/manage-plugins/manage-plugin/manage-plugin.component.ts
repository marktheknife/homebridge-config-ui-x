import { NgClass } from '@angular/common'
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { saveAs } from 'file-saver'
import { NgxMdModule } from 'ngx-md'
import { ToastrService } from 'ngx-toastr'
import { firstValueFrom } from 'rxjs'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import { ApiService } from '@/app/core/api.service'
import { RestartHomebridgeComponent } from '@/app/core/components/restart-homebridge/restart-homebridge.component'
import { PluginsMarkdownDirective } from '@/app/core/directives/plugins.markdown.directive'
import { HbUpdateConfirmComponent } from '@/app/core/manage-plugins/hb-update-confirm/hb-update-confirm.component'
import { PluginLogsComponent } from '@/app/core/manage-plugins/plugin-logs/plugin-logs.component'
import { SettingsService } from '@/app/core/settings.service'
import { IoNamespace, WsService } from '@/app/core/ws.service'

@Component({
  templateUrl: './manage-plugin.component.html',
  styleUrls: ['./manage-plugin.component.scss'],
  standalone: true,
  imports: [
    NgxMdModule,
    PluginsMarkdownDirective,
    TranslatePipe,
    NgClass,
  ],
})

export class ManagePluginComponent implements OnInit, OnDestroy {
  $activeModal = inject(NgbActiveModal)
  private $api = inject(ApiService)
  private $modal = inject(NgbModal)
  private $router = inject(Router)
  $settings = inject(SettingsService)
  private $toastr = inject(ToastrService)
  private $translate = inject(TranslateService)
  private $ws = inject(WsService)

  @Input() pluginName: string
  @Input() pluginDisplayName: string
  @Input() targetVersion = 'latest'
  @Input() latestVersion: string
  @Input() installedVersion: string
  @Input() isDisabled: boolean
  @Input() action: string

  public actionComplete = false
  public actionFailed = false
  public showReleaseNotes = false
  public justUpdatedPlugin = false
  public updateToBeta = false
  public changeLog: string
  public childBridges: any[] = []
  public release: any
  public presentTenseVerb: string
  public pastTenseVerb: string
  public onlineUpdateOk: boolean
  public readonly iconStar = '<i class="fas fa-fw fa-star primary-text"></i>'
  public readonly iconThumbsUp = '<i class="fas fa-fw fa-thumbs-up primary-text"></i>'

  private io: IoNamespace
  private toastSuccess: string
  private term = new Terminal()
  private termTarget: HTMLElement
  private fitAddon = new FitAddon()
  private errorLog = ''

  constructor() {
    this.term.loadAddon(this.fitAddon)
  }

  ngOnInit() {
    this.io = this.$ws.connectToNamespace('plugins')
    this.termTarget = document.getElementById('plugin-log-output')
    this.term.open(this.termTarget)
    this.fitAddon.fit()

    this.io.socket.on('stdout', (data: string | Uint8Array) => {
      this.term.write(data)
      const dataCleaned = data
        .toString()
        .replace(/\x1B\[(\d{1,3}(;\d{1,2})?)?[mGK]/g, '') // eslint-disable-line no-control-regex
        .trimEnd()
      if (dataCleaned) {
        this.errorLog += `${dataCleaned}\r\n`
      }
    })

    this.toastSuccess = this.$translate.instant('toast.title_success')

    this.onlineUpdateOk = !(['homebridge', 'homebridge-config-ui-x'].includes(this.pluginName) && this.$settings.env.platform === 'win32')

    switch (this.action) {
      case 'Install':
        this.install()
        this.presentTenseVerb = this.$translate.instant('plugins.manage.install')
        this.pastTenseVerb = this.$translate.instant('plugins.manage.installed')
        break
      case 'Uninstall':
        this.uninstall()
        this.presentTenseVerb = this.$translate.instant('plugins.manage.uninstall')
        this.pastTenseVerb = this.$translate.instant('plugins.manage.uninstalled')
        break
      case 'Update':
        switch (this.targetVersion) {
          case 'latest':
            this.updateToBeta = false
            this.getReleaseNotes()
            break
          case 'alpha':
          case 'beta':
          case 'test':
            this.updateToBeta = true
            this.getReleaseNotes()
            break
          default:
            this.update()
        }
        this.presentTenseVerb = this.$translate.instant('plugins.manage.update')
        this.pastTenseVerb = this.$translate.instant('plugins.manage.updated')
        break
    }
  }

  install() {
    if (!this.onlineUpdateOk) {
      return
    }

    if (this.pluginName === 'homebridge') {
      return this.upgradeHomebridge()
    }

    this.io.request('install', {
      name: this.pluginName,
      version: this.targetVersion,
      termCols: this.term.cols,
      termRows: this.term.rows,
    }).subscribe({
      next: () => {
        this.$activeModal.close()
        this.$toastr.success(`${this.pastTenseVerb} ${this.pluginName}`, this.toastSuccess)
        window.location.href = `/plugins?installed=${this.pluginName}`
      },
      error: (error) => {
        this.actionFailed = true
        console.error(error)
        this.$router.navigate(['/plugins'])
        this.$toastr.error(error.message, this.$translate.instant('toast.title_error'))
      },
    })
  }

  uninstall() {
    this.io.request('uninstall', {
      name: this.pluginName,
      termCols: this.term.cols,
      termRows: this.term.rows,
    }).subscribe({
      next: () => {
        this.$activeModal.close()
        this.$router.navigate(['/plugins'])
        this.$modal.open(RestartHomebridgeComponent, {
          size: 'lg',
          backdrop: 'static',
        })
      },
      error: (error) => {
        this.actionFailed = true
        console.error(error)
        this.$toastr.error(error.message, this.$translate.instant('toast.title_error'))
      },
    })
  }

  update() {
    // Hide the release notes
    this.showReleaseNotes = false

    if (!this.onlineUpdateOk) {
      return
    }

    // If this is updating homebridge, use an alternative workflow
    if (this.pluginName === 'homebridge') {
      return this.upgradeHomebridge()
    }

    this.io.request('update', {
      name: this.pluginName,
      version: this.targetVersion,
      termCols: this.term.cols,
      termRows: this.term.rows,
    }).subscribe({
      next: async () => {
        try {
          await Promise.all([this.getChangeLog(), this.getChildBridges()])
        } catch (error) {
          console.error(error)
        }
        this.actionComplete = true
        this.justUpdatedPlugin = true
        this.$router.navigate([this.pluginName === 'homebridge-config-ui-x' ? '/' : '/plugins'])
      },
      error: (error) => {
        this.actionFailed = true
        console.error(error)
        this.$toastr.error(error.message, this.$translate.instant('toast.title_error'))
      },
    })
  }

  async upgradeHomebridge() {
    let res = 'update'

    // Only want to show this modal updating from existing version <2 to 2
    // This is just some temporary not-so-great logic to determine if the user is updating from <2 to 2
    if (
      Number(this.installedVersion.split('.')[0]) < 2
      && ['2', 'alpha', 'beta'].includes(this.targetVersion.split('.')[0])
    ) {
      const ref = this.$modal.open(HbUpdateConfirmComponent, {
        size: 'lg',
        backdrop: 'static',
      })
      res = await ref.result
    }

    if (res === 'update') {
      // Continue selected, so update homebridge
      this.io.request('homebridge-update', {
        version: this.targetVersion,
        termCols: this.term.cols,
        termRows: this.term.rows,
      }).subscribe({
        next: () => {
          this.$activeModal.close()
          const ref = this.$modal.open(RestartHomebridgeComponent, {
            size: 'lg',
            backdrop: 'static',
          })
          ref.componentInstance.fullRestart = true
        },
        error: (error) => {
          this.actionFailed = true
          console.error(error)
          this.$toastr.error(error.message, this.$translate.instant('toast.title_error'))
          this.$activeModal.close()
        },
      })
    } else {
      // Modal dismissed, also close the update modal
      this.$activeModal.close()
    }
  }

  async getChangeLog(): Promise<void> {
    const data: { changelog: string } = await firstValueFrom(this.$api.get(`/plugins/changelog/${encodeURIComponent(this.pluginName)}`))
    this.changeLog = data.changelog
  }

  async getChildBridges(): Promise<void> {
    if (!this.$settings.env.serviceMode) {
      return
    }
    const data: any[] = await firstValueFrom(this.$api.get('/status/homebridge/child-bridges'))
    data.forEach((bridge) => {
      if (this.pluginName === bridge.plugin) {
        this.childBridges.push(bridge)
      }
    })
  }

  getReleaseNotes() {
    this.$api.get(`/plugins/release/${encodeURIComponent(this.pluginName)}`).subscribe({
      next: (data) => {
        this.showReleaseNotes = true
        this.release = data
      },
      error: () => {
        if (this.onlineUpdateOk) {
          this.update()
        }
      },
    })
  }

  public onRestartHomebridgeClick() {
    if (this.pluginName === 'homebridge-config-ui-x') {
      this.$api.put('/platform-tools/hb-service/set-full-service-restart-flag', {}).subscribe({
        next: () => {
          window.location.href = '/restart'
        },
        error: (error) => {
          console.error(error)
          window.location.href = '/restart'
        },
      })
    } else {
      this.$router.navigate(['/restart'])
      this.$activeModal.close()
    }
  }

  public async onRestartChildBridgeClick() {
    try {
      for (const bridge of this.childBridges) {
        await firstValueFrom(this.$api.put(`/server/restart/${bridge.username}`, {}))
      }
      const ref = this.$modal.open(PluginLogsComponent, {
        size: 'xl',
        backdrop: 'static',
      })
      ref.componentInstance.plugin = { name: this.pluginName }
    } catch (error) {
      console.error(error)
      this.$toastr.error(this.$translate.instant('plugins.manage.child_bridge_restart_failed'), this.$translate.instant('toast.title_error'))
    } finally {
      this.$activeModal.close()
    }
  }

  downloadLogFile() {
    const blob = new Blob([this.errorLog], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${this.pluginName}-error.log`)
  }

  ngOnDestroy() {
    this.io.end()
  }
}
