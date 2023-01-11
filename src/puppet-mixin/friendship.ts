import * as PUPPET from '@juzi/wechaty-puppet'
import { log } from '../config.js'
import { WA_ERROR_TYPE } from '../exception/error-type.js'
import WAError from '../exception/whatsapp-error.js'
import type PuppetWhatsApp from '../puppet-whatsapp.js'
import type { WhatsAppMessagePayload } from '../schema/whatsapp-type.js'

const PRE = 'MIXIN_FRIENDSHIP'

export type FriendshipRawPayload = WhatsAppMessagePayload

export async function friendshipRawPayload (this: PuppetWhatsApp, id: string): Promise<FriendshipRawPayload> {
  if (id.startsWith('friendshipFromContact-')) {
    // friendship from friendshipAdd
    const data = getFriendshipFromContactData(id)
    return {
      from: data.contactId,
      body: '',
      id: {
        id,
      },
      timestamp: data.timestamp,
      type: PUPPET.types.Friendship.Confirm,
    } as any
  }
  const cache = await this.manager.getCacheManager()
  const message = await cache.getMessageRawPayload(id)
  if (!message) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, 'Message not found', `messageId: ${id}`)
  }
  return message
}

export async function friendshipRawPayloadParser (rawPayload: FriendshipRawPayload): Promise<PUPPET.payloads.Friendship> {
  return {
    contactId: rawPayload.from,
    hello: rawPayload.body,
    id: rawPayload.id.id,
    timestamp: rawPayload.timestamp,
    type: PUPPET.types.Friendship.Confirm,
  }
}

export async function friendshipSearchPhone (
  this: PuppetWhatsApp,
  phone: string,
): Promise<null | string> {
  log.verbose(PRE, 'friendshipSearchPhone(%s)', phone)
  const contactId = `${phone}@c.us`
  const isUser = await this.manager.isWhatsappUser(contactId)
  if (!isUser) {
    throw WAError(WA_ERROR_TYPE.ERR_CONTACT_NOT_FOUND, 'Not a registered user on WhatsApp.', `contactId: ${contactId}`)
  }
  return contactId
}

export async function friendshipSearchWeixin (
  weixin: string,
): Promise<null | string> {
  log.verbose(PRE, 'friendshipSearchWeixin(%s)', weixin)
  return PUPPET.throwUnsupportedError()
}

export async function friendshipSearchHandle (
  handle: string,
): Promise<null | string> {
  log.verbose(PRE, 'friendshipSearchHandle(%s)', handle)
  return PUPPET.throwUnsupportedError()
}

export async function friendshipAdd (
  this: PuppetWhatsApp,
  contactId: string,
  option?: PUPPET.types.FriendshipAddOptions,
): Promise<void> {
  let hello: string = ''
  if (typeof (option) === 'object') {
    hello = option.hello || ''
  } else {
    hello = option || ''
  }

  // allow no hello for miaohui batch add
  // if (hello.length === 0) {
  //   hello = STRINGS[LANGUAGE].DEFAULT_HELLO_MESSAGE
  // }

  log.verbose(PRE, 'friendshipAdd(%s, %s)', contactId, JSON.stringify(option))
  const isUser = await this.manager.isWhatsappUser(contactId)
  if (!isUser) {
    throw WAError(WA_ERROR_TYPE.ERR_CONTACT_NOT_FOUND, 'Not a registered user on WhatsApp.', `contactId: ${contactId}`)
  }

  const contactPayload = await this.contactRawPayload(contactId)

  let messageId
  if (hello) {
    messageId = await this.messageSendText(contactId, hello)
  }

  if (!(await this.contactRawPayloadParser(contactPayload)).friend) {
    this.emit('friendship', {
      friendshipId: messageId || `friendshipFromContact-${contactId}-timestamp-${String(Date.now())}`,
    })
  }
}

export async function friendshipAccept (
  friendshipId: string,
): Promise<void> {
  log.verbose(PRE, 'friendshipAccept(%s)', friendshipId)
  return PUPPET.throwUnsupportedError()
}

export function getFriendshipFromContactData (id: string) {
  if (!id.startsWith('friendshipFromContact-')) {
    throw WAError(WA_ERROR_TYPE.ERR_CONTACT_NOT_FOUND, 'Not a friendshipFromContact id', `id: ${id}`)
  }
  const idLength = id.length
  const contactId = id.substring(22, idLength - 24)
  const timestamp = Number(id.substring(idLength - 13))
  return {
    contactId,
    timestamp,
  }
}
