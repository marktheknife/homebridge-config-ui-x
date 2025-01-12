import { NgClass, NgStyle } from '@angular/common'
import { Component, ElementRef, inject, Input, OnInit, viewChild } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { Subject } from 'rxjs'

import { QrcodeComponent } from '@/app/core/components/qrcode/qrcode.component'
import { IoNamespace, WsService } from '@/app/core/ws.service'

@Component({
  templateUrl: './hap-qrcode-widget.component.html',
  standalone: true,
  imports: [
    NgStyle,
    QrcodeComponent,
    TranslatePipe,
    NgClass,
  ],
})
export class HapQrcodeWidgetComponent implements OnInit {
  private $ws = inject(WsService)

  readonly pincodeElement = viewChild<ElementRef>('pincode')
  readonly qrcodeContainerElement = viewChild<ElementRef>('qrcodecontainer')

  @Input() resizeEvent: Subject<any>

  public paired: boolean = false
  public pin = 'Loading...'
  public setupUri: string | null = null
  public qrCodeHeight: number
  public qrCodeWidth: number

  private io: IoNamespace

  constructor() {}

  ngOnInit() {
    this.io = this.$ws.getExistingNamespace('status')

    this.resizeQrCode()

    this.io.socket.on('homebridge-status', (data) => {
      this.pin = data.pin
      this.paired = data.paired

      if (data.setupUri) {
        this.setupUri = data.setupUri
      }
    })

    if (this.io.socket.connected) {
      this.getPairingPin()
    }

    // Subscribe to grid resize events
    this.resizeEvent.subscribe({
      next: () => {
        this.resizeQrCode()
      },
    })
  }

  resizeQrCode() {
    const containerHeight = (this.qrcodeContainerElement().nativeElement as HTMLElement).offsetHeight
    const containerWidth = (this.qrcodeContainerElement().nativeElement as HTMLElement).offsetWidth
    const pinCodeHeight = (this.pincodeElement().nativeElement as HTMLElement).offsetHeight

    this.qrCodeHeight = containerHeight - pinCodeHeight
    this.qrCodeWidth = containerWidth > this.qrCodeHeight ? this.qrCodeHeight : containerWidth
  }

  getPairingPin() {
    this.io.request('get-homebridge-pairing-pin').subscribe((data) => {
      this.pin = data.pin
      this.setupUri = data.setupUri
      this.paired = data.paired
    })
  }
}
