import * as PUPPET from '@juzi/wechaty-puppet'
import { log } from '../config.js'
import { WA_ERROR_TYPE } from '../exception/error-type.js'
import WAError from '../exception/whatsapp-error.js'
import type PuppetWhatsApp from '../puppet-whatsapp.js'
import { Friendship } from '@juzi/wechaty-puppet/payloads'

const PRE = 'MIXIN_FRIENDSHIP'

export async function friendshipRawPayload (this: PuppetWhatsApp, id: string): Promise<Friendship> {
  const cache = await this.manager.getCacheManager()
  const friendship = await cache.getFriendshipRawPayload(id)
  if (!friendship) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, 'Friendship not found', `friendshipId: ${id}`)
  }
  return friendship
}

export async function friendshipRawPayloadParser (rawPayload: Friendship): Promise<PUPPET.payloads.Friendship> {
  return rawPayload
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

  log.info(PRE, 'friendshipAdd(%s, %s)', contactId, JSON.stringify(option))
  const isUser = await this.manager.isWhatsappUser(contactId)
  if (!isUser) {
    throw WAError(WA_ERROR_TYPE.ERR_CONTACT_NOT_FOUND, 'Not a registered user on WhatsApp.', `contactId: ${contactId}`)
  }

  const contactPayload = await this.contactRawPayload(contactId, true)
  if (!contactPayload.isMyContact) {
    const contactPhone = contactId.split('@')[0] || ''
    await this.manager.getWhatsAppClient().saveOrEditAddressbookContact(contactPhone, contactPayload.pushname || contactPhone, '', true)
  }

  if (hello) {
    await this.messageSendText(contactId, hello)
  }
}

export async function friendshipAccept (
  this: PuppetWhatsApp,
  friendshipId: string,
): Promise<void> {
  const friendshipPayload = await this.friendshipRawPayload(friendshipId)
  const contactPhone = friendshipPayload.contactId.split('@')[0] || ''
  const contactPayload = await this.contactRawPayload(friendshipPayload.contactId, true)
  if (!contactPayload.isMyContact) {
    await this.manager.getWhatsAppClient().saveOrEditAddressbookContact(contactPhone, contactPayload.pushname || '', '', true)
  }
}
