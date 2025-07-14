import * as PUPPET from '@juzi/wechaty-puppet'
import {
  MessageMediaTypeList,
  log,
} from '../../config.js'
import {
  MessageTypes as WhatsAppMessageType,
  MessageAck,
} from '../../schema/whatsapp-interface.js'
import WhatsAppBase from '../whatsapp-base.js'

import type {
  WhatsAppMessage,
  WhatsAppMessagePayload,
} from '../../schema/whatsapp-type.js'
import {
  isContactId,
  isInviteLink,
  getInviteCode,
  sleep,
} from '../../helper/miscellaneous.js'
import { RequestPool } from '../../request/request-pool.js'
import { v4 } from 'uuid'

const PRE = 'MessageEventHandler'

export default class MessageEventHandler extends WhatsAppBase {

  public async onMessage (message: WhatsAppMessage | WhatsAppMessagePayload) {
    log.info(PRE, `onMessage(${JSON.stringify(message)})`)
    if (!(await this.checkCacheManager())) {
      log.warn('message ignored because login process is not finished')
      return
    }

    // @ts-ignore
    if (
      message.type === 'multi_vcard'
      || (message.type === 'e2e_notification'
      && message.body === ''
      && !message.author)
    ) {
      // skip room join notification and multi_vcard message
      return
    }
    const cacheManager = await this.manager.getCacheManager()
    const messageId = message.id.id
    const messageInCache = await cacheManager.getMessageRawPayload(messageId)
    if (messageInCache) {
      return
    }
    await cacheManager.setMessageRawPayload(messageId, message)
    if ((message as WhatsAppMessagePayload)._data?.caption && (message as WhatsAppMessagePayload)._data?.type === 'image') { // see issue: https://github.com/wechaty/puppet-whatsapp/issues/390
      // file message also have captions, but no text message should be generated
      const genTextMessageFromImageMessage = message as WhatsAppMessagePayload
      genTextMessageFromImageMessage.type = WhatsAppMessageType.TEXT
      const textMsgId = `${genTextMessageFromImageMessage.id.id}_TEXT`
      genTextMessageFromImageMessage.id.id = textMsgId
      genTextMessageFromImageMessage._data = undefined
      await this.onMessage(genTextMessageFromImageMessage)
    }

    const contactId = message.from
    if (contactId && isContactId(contactId)) {
      const contact = await cacheManager.getContactOrRoomRawPayload(contactId)
      const notFriend = !contact?.isMyContact
      if (notFriend) {
        const friendship: PUPPET.payloads.Friendship = {
          id: v4(),
          contactId,
          hello: message.body,
          timestamp: message.timestamp,
          type: PUPPET.types.Friendship.Receive,
          ticket: '',
        }
        await cacheManager.setFriendshipRawPayload(friendship.id, friendship)
        this.emit('friendship', { friendshipId: friendship.id })
      }
    }

    const needEmitMessage = await this.convertInviteLinkMessageToEvent(message)
    if (needEmitMessage) {
      this.emit('message', { messageId })
    }
  }

  /**
   * This event only for the message which sent by bot (web / phone)
   * @param {WhatsAppMessage} message message detail info
   * @returns
   */
  public async onMessageAck (message: WhatsAppMessage) {
    log.silly(PRE, `onMessageAck(${JSON.stringify(message)})`)
    if (!(await this.checkCacheManager())) {
      log.warn('message ignored because login process is not finished')
      return
    }
    /**
     * if message ack equal MessageAck.ACK_DEVICE, we could regard it as has already send success.
     *
     * FIXME: if the ack is not consecutive, and without MessageAck.ACK_DEVICE, then we could not receive this message.
     *
     * After add sync missed message schedule, if the ack of message has not reach MessageAck.ACK_DEVICE,
     * the schedule will emit these messages with wrong ack (ack = MessageAck.ACK_PENDING or MessageAck.ACK_SERVER),
     * and will make some mistakes (can not get the media of message).
     */
    if (message.id.fromMe) {
      if (MessageMediaTypeList.includes(message.type)) {
        if (message.hasMedia && message.ack === MessageAck.ACK_SERVER) {
          await this.processMessageFromBot(message)
        }
        if (message.ack === MessageAck.ACK_DEVICE || message.ack === MessageAck.ACK_READ) {
          await this.processMessageFromBot(message)
        }
      } else {
        await this.processMessageFromBot(message)
      }
    }
  }

  /**
   * This event only for the message which sent by bot (web / phone) and to the bot self
   * @param {WhatsAppMessage} message message detail info
   * @returns
   */
  public async onMessageCreate (message: WhatsAppMessage) {
    log.silly(PRE, `onMessageCreate(${JSON.stringify(message)})`)
    if (!(await this.checkCacheManager())) {
      log.warn('message ignored because login process is not finished')
      return
    }
    if (message.id.fromMe) {
      const messageId = message.id.id
      const cacheManager = await this.manager.getCacheManager()
      await cacheManager.setMessageRawPayload(messageId, message)
      // void sleep
      // const requestPool = RequestPool.Instance
      // const now = Date.now()
      // while (!requestPool.hasRequest(messageId) && Date.now() - now < 400) {
      //   await sleep(100)
      // }
      // requestPool.resolveRequest(messageId)
      await sleep(1000)
      // wait for sent message method return to avoid duplicate message
      // self sent message is not time sensitive, so we can wait for a while
      this.emit('message', { messageId })
    }
  }

  public async processMessageFromBot (message: WhatsAppMessage) {
    const messageId = message.id.id
    const cacheManager = await this.manager.getCacheManager()
    const messageInCache = await cacheManager.getMessageRawPayload(messageId)
    await cacheManager.setMessageRawPayload(messageId, message) // set message with different message ack
    /**
     * - Non-Media Message
     *   emit only when no cache
     *
     * - Media Message
     *   emit message when no cache or ack of message in cache equal 1
     */
    if (!messageInCache || (MessageMediaTypeList.includes(message.type) && messageInCache.ack === MessageAck.ACK_SERVER)) {
      if (!message.author) {
        // based on experience, not officially conformed
        // self message from other device contains author
        // while sent from this puppet it's undefined
        log.info(PRE, `seems to be self sent message, so skip. id: ${messageId}, base content: ${message.body}`)
        return
      }
      const requestPool = RequestPool.Instance
      const hasRequest = requestPool.resolveRequest(messageId)
      if (!hasRequest) {
        this.emit('message', { messageId })
      }
    }

    if (messageInCache && message.id.fromMe && message.ack > messageInCache.ack && [MessageAck.ACK_READ, MessageAck.ACK_PLAYED].includes(message.ack)) {
      await cacheManager.setMessageRawPayload(messageId, message)
      this.emit('dirty', {
        payloadId: messageId,
        payloadType: PUPPET.types.Dirty.Message,
      })
    }
  }

  public async convertInviteLinkMessageToEvent (message: WhatsAppMessage | WhatsAppMessagePayload): Promise<boolean> {
    const cacheManager = await this.manager.getCacheManager()
    if (message.type === WhatsAppMessageType.GROUP_INVITE) {
      const inviteCode = message.inviteV4?.inviteCode
      if (inviteCode) {
        const roomInvitationPayload: PUPPET.payloads.EventRoomInvite = {
          roomInvitationId: inviteCode,
        }
        await cacheManager.setRoomInvitationRawPayload(inviteCode, { inviteCode })
        this.emit('room-invite', roomInvitationPayload)
      } else {
        log.warn(PRE, `convertInviteLinkMessageToEvent can not get invite code: ${JSON.stringify(message)}`)
      }
      return false
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (message.type === WhatsAppMessageType.TEXT && message.links && message.links.length === 1 && isInviteLink(message.links[0]!.link)) {
      const inviteCode = getInviteCode(message.links[0]!.link)
      if (inviteCode) {
        const roomInvitationPayload: PUPPET.payloads.EventRoomInvite = {
          roomInvitationId: inviteCode,
        }
        await cacheManager.setRoomInvitationRawPayload(inviteCode, { inviteCode })
        this.emit('room-invite', roomInvitationPayload)
        return false
      }
    }
    return true
  }

  public async onIncomingCall (...args: any[]) { // it is a any[] argument
    log.silly(PRE, `onIncomingCall(${JSON.stringify(args)})`)
  }

  public async onMediaUploaded (message: WhatsAppMessage) {
    log.silly(PRE, `onMediaUploaded(${JSON.stringify(message)})`)
    await this.createOrUpdateImageMessage(message)
    if (!message.hasMedia) {
      log.warn(PRE, `onMediaUploaded failed, message id: ${message.id.id}, type: ${message.type}, detail info: ${JSON.stringify(message)}`)
    }
  }

  public async createOrUpdateImageMessage (message: WhatsAppMessage) {
    if (message.type === WhatsAppMessageType.IMAGE) {
      const messageId = message.id.id
      const cacheManager = await this.manager.getCacheManager()
      const messageInCache = await cacheManager.getMessageRawPayload(messageId)
      if (messageInCache) {
        message.body = messageInCache.body || message.body
        await cacheManager.setMessageRawPayload(messageId, message)
        return
      }
      await cacheManager.setMessageRawPayload(messageId, message)
    }
  }

  /**
   * Someone delete message in all devices. Due to they have the same message id so we generate a fake id as flash-store key.
   * see: https://github.com/pedroslopez/whatsapp-web.js/issues/1178
   * @param message revoke message
   * @param revokedMsg original message, sometimes it will be null
   */
  public async onMessageRevokeEveryone (message: WhatsAppMessage, revokedMsg?: WhatsAppMessage | null | undefined) {
    log.silly(PRE, `onMessageRevokeEveryone(newMsg: ${JSON.stringify(message)}, originalMsg: ${JSON.stringify(revokedMsg)})`)
    if (!(await this.checkCacheManager())) {
      log.warn('message ignored because login process is not finished')
      return
    }
    const cacheManager = await this.manager.getCacheManager()
    const messageId = message.id.id
    if (revokedMsg) {
      const originalMessageId = revokedMsg.id.id
      const recalledMessageId = this.generateFakeRecallMessageId(originalMessageId)
      message.body = recalledMessageId
      await cacheManager.setMessageRawPayload(recalledMessageId, revokedMsg)
    }
    await cacheManager.setMessageRawPayload(messageId, message)
    this.emit('message', { messageId })
  }

  /**
   * Only delete message in bot phone will trigger this event. But the message type is chat, not revoked any more.
   */
  public async onMessageRevokeMe (message: WhatsAppMessage) {
    log.silly(PRE, `onMessageRevokeMe(${JSON.stringify(message)})`)
    if (!(await this.checkCacheManager())) {
      log.warn('message ignored because login process is not finished')

    }
    /*
    if (message.ack === MessageAck.ACK_PENDING) {
      // when the bot logout, it will receive onMessageRevokeMe event, but it's ack is MessageAck.ACK_PENDING, so let's ignore this event.
      return
    }
    const cacheManager = await this.manager.getCacheManager()
    const messageId = message.id.id
    message.type = WhatsAppMessageType.REVOKED
    message.body = messageId
    const recalledMessageId = this.generateFakeRecallMessageId(messageId)
    await cacheManager.setMessageRawPayload(recalledMessageId, message)
    this.emit('message', { messageId: recalledMessageId })
    */
  }

  public generateFakeRecallMessageId (messageId: string) {
    return `${messageId}_revoked`
  }

  private async checkCacheManager () {
    let cacheManager
    try {
      cacheManager = await this.manager.getCacheManager()
    } catch (e) {}
    if (!cacheManager) {
      log.warn(PRE, 'message comes before login process finished')
      return false
    }
    return true
  }

}
