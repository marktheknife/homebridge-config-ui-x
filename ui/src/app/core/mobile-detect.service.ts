import { Injectable } from '@angular/core'
import MobileDetect from 'mobile-detect'

function preventDefault(e: Event) {
  e.preventDefault()
}

@Injectable({
  providedIn: 'root',
})
export class MobileDetectService {
  public detect: MobileDetect
  public isTouchMoveLocked = false

  constructor() {
    this.detect = new MobileDetect(window.navigator.userAgent)
  }

  public disableTouchMove() {
    if (!this.isTouchMoveLocked) {
      document.body.addEventListener('touchmove', preventDefault, { passive: false })
      this.isTouchMoveLocked = true
    }
  }

  public enableTouchMove() {
    document.body.removeEventListener('touchmove', preventDefault)
    this.isTouchMoveLocked = false
  }
}
