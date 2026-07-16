/* eslint-disable no-case-declarations */
import * as PUPPET from '@juzi/wechaty-puppet'
import {
  MIN_BATTERY_VALUE_FOR_LOGOUT,
  DEFAULT_TIMEOUT,
  log,
  STRINGS,
  LANGUAGE,
} from '../../config.js'
import { WA_ERROR_TYPE } from '../../exception/error-type.js'
import WAError from '../../exception/whatsapp-error.js'
import {
  WAState,
} from '../../schema/whatsapp-interface.js'
import WhatsAppBase from '../whatsapp-base.js'

import type {
  WhatsAppContact,
  BatteryInfo,
  WAStateType,
} from '../../schema/whatsapp-type.js'
import {
  batchProcess,
  isContactId,
  isRoomId,
  sleep,
} from '../../helper/miscellaneous.js'

const PRE = 'LoginEventHandler'

export default class LoginEventHandler extends WhatsAppBase { // FIXME: I have no good idea for this class name.

  protected loadingData: boolean = false
  private qrcodeOrLoginCheckTimer?: NodeJS.Timer
  private hasLogin: boolean = false
  private lastQRCodeTime = Date.now()

  public onQRCode (qrcode: string) {
    log.info(PRE, `onQRCode(${qrcode})`)
    // NOTE: This event will not be fired if a session is specified.
    this.lastQRCodeTime = Date.now()
    this.hasLogin = false
    this.emit('scan', { qrcode, status: PUPPET.types.ScanStatus.Waiting, timestamp: Date.now() })
    this.checkQRCodeOrLoginEvent()
  }

  private checkQRCodeOrLoginEvent () {
    if (this.qrcodeOrLoginCheckTimer) {
      return
    }
    this.qrcodeOrLoginCheckTimer = setInterval(() => {
      if (!this.hasLogin && Date.now() > this.lastQRCodeTime + 2 * 60 * 1000) {
        this.emit('error', 'can not get scan or login event more than 2 mins')
      }
    }, 25 * 1000)
  }

  public clearQrcodeOrLoginCheckTimer () {
    if (!this.qrcodeOrLoginCheckTimer) {
      return
    }
    clearInterval(this.qrcodeOrLoginCheckTimer as any)
  }

  public async onAuthenticated () {
    log.info(PRE, 'onAuthenticated()')
  }

  public async onAuthFailure (message: string) {
    log.warn(PRE, 'auth_failure: %s', message)
    // avoid reuse invalid session data
    await this.clearSession()
  }

  public async onWhatsAppReady () {
    log.verbose(PRE, 'onWhatsAppReady()')
    if (this.hasLogin) {
      log.info(PRE, 'onWhatsAppReady() already login, skip')
      return
    }
    this.hasLogin = true
    this.clearQrcodeOrLoginCheckTimer()
    const whatsapp = this.getWhatsAppClient()
    try {
      this.botId = whatsapp.info.wid._serialized
      await this.manager.initCache(this.botId)
    } catch (error) {
      throw WAError(WA_ERROR_TYPE.ERR_INIT, `Can not get bot id from WhatsApp client, current state: ${await whatsapp.getState()}`, JSON.stringify(error))
    }
    try {
      await this.onLogin()
      const contactOrRoomList = await this.manager.syncContactOrRoomList()
      await this.onReady(contactOrRoomList)
    } catch (error) {
      // onWhatsAppReady 作为事件监听器运行,异常若不在此兜住会变成
      // unhandledRejection,ready 事件静默丢失且无明确报错
      log.error(PRE, `onWhatsAppReady() failed, ready event will not be emitted, error: ${(error as Error).stack}`)
      throw error
    }
    this.manager.startSchedule()
  }

  public async onLogin () {
    log.verbose(PRE, 'onLogin()')
    const whatsapp = this.getWhatsAppClient()
    log.info(PRE, `WhatsApp Client Info: ${JSON.stringify(whatsapp.info)}`)

    const cacheManager = await this.manager.getCacheManager()

    const botSelf = await this.manager.requestManager.getContactById(this.botId!)
    await cacheManager.setContactOrRoomRawPayload(this.botId!, {
      ...botSelf,
      avatar: await this.manager.requestManager.getAvatarUrl(this.botId!),
    })

    this.emit('login', this.botId!)
    log.info(PRE, `onLogin(${this.botId}})`)
  }

  public async onReady (contactOrRoomList: WhatsAppContact[]) {
    log.verbose(PRE, 'onReady()')
    if (this.loadingData) {
      log.verbose(PRE, 'onReady() loading data are under process.')
      return
    }
    this.loadingData = true
    let friendCount = 0
    let contactCount = 0
    let roomCount = 0

    try {
      const cacheManager = await this.manager.getCacheManager()
      const batchSize = 100
      await batchProcess(batchSize, contactOrRoomList, async (contactOrRoom: WhatsAppContact) => {
        const contactOrRoomId = contactOrRoom.id._serialized
        try {
          const avatar = await contactOrRoom.getProfilePicUrl()
          const contactWithAvatar = Object.assign(contactOrRoom, { avatar })
          if (isContactId(contactOrRoomId)) {
            contactCount++
            if (contactOrRoom.isMyContact) {
              friendCount++
            }
            await cacheManager.setContactOrRoomRawPayload(contactOrRoomId, contactWithAvatar)
          } else if (isRoomId(contactOrRoomId)) {
            let memberList: string[] = []
            try {
              memberList = await this.manager.syncRoomMemberList(contactOrRoomId)
            } catch (error) {
              log.warn(PRE, `syncRoomMemberList(${contactOrRoomId}) failed, ${JSON.stringify(error)}`)
            }
            if (memberList.length > 0) {
              roomCount++
              await cacheManager.setContactOrRoomRawPayload(contactOrRoomId, contactWithAvatar)
            } else {
              await cacheManager.deleteContactOrRoom(contactOrRoomId)
              await cacheManager.deleteRoomMemberIdList(contactOrRoomId)
              return
            }
          } else {
            log.warn(PRE, `Unknown contact type: ${JSON.stringify(contactOrRoom)}`)
          }
          await this.manager.processHistoryMessages(contactOrRoom)
        } catch (error) {
          // 单个联系人/群处理失败(如 LID 会话在页面侧抛错)只跳过该项,
          // 不能中断整个 onReady,否则 ready 事件发不出、联系人无法同步
          log.warn(PRE, `onReady() process contactOrRoom(${contactOrRoomId}) failed, skip it, error: ${(error as Error).message}`)
        }
      })

      log.info(PRE, `onReady() all contacts and rooms are ready, friendCount: ${friendCount} contactCount: ${contactCount} roomCount: ${roomCount}`)
      await sleep(15 * 1000)
      this.emit('ready')
    } finally {
      this.loadingData = false
    }
  }

  public async onLogout (reason: string = STRINGS[LANGUAGE].LOGOUT_REASON.DEFAULT) {
    log.verbose(PRE, `onLogout(${reason})`)
    await this.clearSession()
    this.hasLogin = false
    this.manager.stopSchedule()
    this.emit('logout', this.getBotId(), reason as string)
    this.baseStop()

    if (!this.getWhatsAppClient().pupPage) {
      await this.getWhatsAppClient().initialize()
    }
  }

  public async onChangeState (state: WAStateType) {
    log.info(PRE, `onChangeState(${JSON.stringify(state)})`)
    if (!this.botId) {
      throw WAError(WA_ERROR_TYPE.ERR_INIT, 'No login bot id.')
    }

    switch (state) {
      case WAState.TIMEOUT:
        this.pendingLogoutEmitTimer = setTimeout(() => {
          this.emit('logout', this.getBotId(), STRINGS[LANGUAGE].LOGOUT_REASON.NETWORK_TIMEOUT_IN_PHONE)
          this.pendingLogoutEmitTimer = undefined
        }, DEFAULT_TIMEOUT.TIMEOUT_WAIT_CONNECTED)
        break
      case WAState.CONNECTED:
        this.clearPendingLogoutEmitTimer()
        this.emit('login', this.botId)
        this.loadingData = false
        const contactOrRoomList = await this.manager.syncContactOrRoomList()
        await this.onReady(contactOrRoomList)
        break
      default:
        break
    }
  }

  /**
   * unsupported events
   * leave logs to for further dev
  */
  public async onChangeBattery (batteryInfo: BatteryInfo) {
    log.verbose(PRE, `onChangeBattery(${JSON.stringify(batteryInfo)})`)
    if (!this.botId) {
      throw WAError(WA_ERROR_TYPE.ERR_INIT, 'No login bot id.')
    }

    if (batteryInfo.battery <= MIN_BATTERY_VALUE_FOR_LOGOUT && !batteryInfo.plugged) {
      this.emit('logout', this.botId, STRINGS[LANGUAGE].LOGOUT_REASON.BATTERY_LOWER_IN_PHONE)
    }
  }

}
