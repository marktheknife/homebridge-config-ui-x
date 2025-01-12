import { Component, inject, OnDestroy, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { TranslatePipe, TranslateService } from '@ngx-translate/core'
import { ToastrService } from 'ngx-toastr'

/* global NodeJS */
import { ApiService } from '@/app/core/api.service'
import { SettingsService } from '@/app/core/settings.service'
import { IoNamespace, WsService } from '@/app/core/ws.service'

@Component({
  templateUrl: './restart-linux.component.html',
  styleUrls: ['./restart-linux.component.scss'],
  standalone: true,
  imports: [TranslatePipe],
})
export class RestartLinuxComponent implements OnInit, OnDestroy {
  private $api = inject(ApiService)
  private $router = inject(Router)
  private $settings = inject(SettingsService)
  private $toastr = inject(ToastrService)
  private $translate = inject(TranslateService)
  private $ws = inject(WsService)

  checkTimeout: NodeJS.Timeout
  checkDelay: NodeJS.Timeout
  resp: any = {}
  timeout = false
  error: any = false

  private io: IoNamespace

  constructor() {}

  ngOnInit() {
    this.io = this.$ws.connectToNamespace('status')
    this.io.connected.subscribe(() => {
      this.io.socket.emit('monitor-server-status')
      this.$settings.getAppSettings().catch(() => { /* do nothing */ })
    })

    this.$api.put('/platform-tools/linux/restart-host', {}).subscribe({
      next: (data) => {
        this.resp = data
        this.checkIfServerUp()
      },
      error: (error) => {
        console.error(error)
        this.error = this.$translate.instant('platform.linux.server_restart_error')
        this.$toastr.error(this.$translate.instant('platform.linux.server_restart_error'), this.$translate.instant('toast.title_error'))
      },
    })
  }

  checkIfServerUp() {
    this.checkDelay = setTimeout(() => {
      // Listen to homebridge-status events to see when it's back online
      this.io.socket.on('homebridge-status', (data) => {
        if (data.status === 'up' || data.status === 'pending') {
          this.$toastr.success(
            this.$translate.instant('platform.linux.server_restarted'),
            this.$translate.instant('toast.title_success'),
          )
          this.$router.navigate(['/'])
        }
      })
    }, 30000)

    this.checkTimeout = setTimeout(() => {
      this.$toastr.warning(
        this.$translate.instant('platform.linux.server_taking_long_time'),
        this.$translate.instant('toast.title_warning'),
        {
          timeOut: 10000,
        },
      )
      this.timeout = true
    }, 120000)
  }

  ngOnDestroy() {
    this.io.end()

    clearTimeout(this.checkDelay)
    clearTimeout(this.checkTimeout)
  }
}
