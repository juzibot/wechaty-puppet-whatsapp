import * as PUPPET from '@juzi/wechaty-puppet'
import * as path  from 'path'
import mime from 'mime'
import type PuppetWhatsApp from '../puppet-whatsapp.js'
import type {
  MessageContent,
  WhatsAppMessagePayload,
  MessageSendOptions,
} from '../schema/whatsapp-type.js'
import {
  MessageMedia,
  MessageTypes,
  ProductMessage,
  UrlLink,
  MessageTypes as WhatsAppMessageType,
} from '../schema/whatsapp-interface.js'
import { WA_ERROR_TYPE } from '../exception/error-type.js'
import WAError from '../exception/whatsapp-error.js'
import {
  DEFAULT_TIMEOUT,
  FileBox,
  log,
} from '../config.js'
import { convertMessagePayloadToClass } from '../helper/pure-function/convert-function.js'
import { parserMessageRawPayload } from '../helper/pure-function/message-raw-payload-parser.js'
import { parseVcard } from '../helper/pure-function/vcard-parser.js'
import { RequestPool } from '../request/request-pool.js'

const PRE = 'MIXIN_MESSAGE'

/**
  * Get contact message
  * @param messageId message Id
  * @returns contact name
  */
export async function messageContact (this: PuppetWhatsApp, messageId: string): Promise<string> {
  log.verbose(PRE, 'messageContact(%s)', messageId)
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} not found`)
  }
  if (msg.type !== WhatsAppMessageType.CONTACT_CARD) {
    log.error(PRE, 'Message %s is not contact type', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} is not contact type`)
  }
  if (!msg.vCards[0]) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} has no vCards info, detail: ${JSON.stringify(msg)}`)
  }
  try {
    const vcard = parseVcard(msg.vCards[0])
    return vcard.TEL![0]!.waid
  } catch (error) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_CONTACT, `Can not parse contact card from message: ${messageId}, error: ${(error as Error).message}`)
  }
}

/**
* Recall message
* @param messageId message id
* @returns { Promise<boolean> }
*/
export async function messageRecall (this: PuppetWhatsApp, messageId: string): Promise<boolean> {
  log.verbose(PRE, 'messageRecall(%s)', messageId)
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} not found`)
  }
  const msgObj = convertMessagePayloadToClass(this.manager.getWhatsAppClient(), msg)
  try {
    await msgObj.delete(true)
    return true
  } catch (err) {
    log.error(PRE, `Can not recall this message: ${messageId}, error: ${(err as Error).message}`)
    return false
  }
}

/**
* Get moment detail image or video from message
* @param messageId message id
* @param imageType image size to get (may not apply to WhatsApp)
* @returns the image or video
*/
export async function messagePost (this: PuppetWhatsApp, messageId: string, imageType: PUPPET.types.Image) {
  log.verbose(PRE, 'messagePost(%s, %s)', messageId, PUPPET.types.Image[imageType])
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} Not Found`)
  }

  if (!msg.hasMedia) {
    log.error(PRE, 'Message %s does not contain any media', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} does not contain any media`)
  }

  if (msg.type === WhatsAppMessageType.IMAGE) {
    return this.messageImage(messageId, imageType)
  } else if (msg.type === WhatsAppMessageType.VIDEO) {
    return this.messageFile(messageId)
  } else {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Post message ${messageId} with wrong message type: ${msg.type}`)
  }

}

/**
* Get image from message
* @param messageId message id
* @param imageType image size to get (may not apply to WhatsApp)
* @returns the image
*/
export async function messageImage (this: PuppetWhatsApp, messageId: string, imageType: PUPPET.types.Image): Promise<FileBox> {
  log.verbose(PRE, 'messageImage(%s, %s)', messageId, PUPPET.types.Image[imageType])
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} Not Found`)
  }
  if (msg.type !== WhatsAppMessageType.IMAGE || (!msg.hasMedia && !msg.body)) {
    log.error(PRE, 'Message %s does not contain any media', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} does not contain any media`)
  }
  try {
    switch (imageType) {
      case PUPPET.types.Image.HD:
      case PUPPET.types.Image.Artwork:
        if (msg.hasMedia) {
          return downloadMedia.call(this, msg)
        } else {
          return FileBox.fromBase64(msg._data.body, 'thumbnail.jpg')
        }
      case PUPPET.types.Image.Thumbnail:
      default:
        if (msg._data.body) {
          return FileBox.fromBase64(msg._data.body, 'thumbnail.jpg')
        } else {
          return downloadMedia.call(this, msg)
        }
    }
  } catch (error) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_IMAGE, `Message ${messageId} does not contain any media`)
  }
}

/**
* Get the file attached to the message
* @param messageId message id
* @returns the file that attached to the message
*/
export async function messageFile (this: PuppetWhatsApp, messageId: string): Promise<FileBox> {
  log.verbose(PRE, 'messageFile(%s)', messageId)
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} Not Found`)
  }
  if (!msg.hasMedia) {
    log.error(PRE, 'Message %s does not contain any media', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} does not contain any media`)
  }
  try {
    return downloadMedia.call(this, msg)
  } catch (error) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_FILE, `Message ${messageId} does not contain any media`)
  }
}

async function downloadMedia (this: PuppetWhatsApp, msg: WhatsAppMessagePayload) {
  const msgObj = convertMessagePayloadToClass(this.manager.getWhatsAppClient(), msg)
  const media = await msgObj.downloadMedia()
  const filenameExtension = mime.getExtension(media.mimetype)
  const fileBox = FileBox.fromBase64(media.data, media.filename ?? `unknown_name.${filenameExtension}`)
  fileBox.mimeType = media.mimetype
  return fileBox
}

/**
* Get url in the message
* @param messageId message id
* @returns url in the message
*/
export async function messageUrl (this: PuppetWhatsApp, messageId: string): Promise<PUPPET.payloads.UrlLink> {
  log.verbose(PRE, 'messageUrl(%s)', messageId)
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} Not Found`)
  }
  if (msg.links.length === 0) {
    log.error(PRE, 'Message %s is does not contain links', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} does not contain any link message.`)
  }
  try {
    return {
      description: msg.description || 'NO_DESCRIPTION',
      title: msg.title || 'NO_TITLE',
      url: msg.links[0]?.link || msg.body,
    }
  } catch (error) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_URL_LINK, `Get link message: ${messageId} failed, error: ${(error as Error).message}`)
  }
}

/**
* Not supported for WhatsApp
* @param messageId message id
*/
export async function messageMiniProgram (this: PuppetWhatsApp, messageId: string): Promise<PUPPET.payloads.MiniProgram> {
  log.verbose(PRE, 'messageMiniProgram(%s)', messageId)
  return PUPPET.throwUnsupportedError()
}

export async function messageChannel (this: PuppetWhatsApp, messageId: string): Promise<PUPPET.payloads.Channel> {
  log.verbose(PRE, 'messageChannel(%s)', messageId)
  return PUPPET.throwUnsupportedError()
}

export async function messageSend (this: PuppetWhatsApp, conversationId: string, content: MessageContent, options?: MessageSendOptions, timeout = DEFAULT_TIMEOUT.MESSAGE_SEND): Promise<string> {
  log.verbose(PRE, 'messageSend(%s, %s)', conversationId, JSON.stringify(options))

  const msg = await this.manager.sendMessage(conversationId, content, options)
  const messageId = msg.id.id
  const requestPool = RequestPool.Instance
  await requestPool.pushRequest(messageId, timeout)
  return messageId
}

export async function messageSendText (this: PuppetWhatsApp, conversationId: string, text: string, options: PUPPET.types.MessageSendTextOptions = {}): Promise<void | string> {
  log.verbose(PRE, 'messageSendText(%s, %s, %s)', conversationId, text, JSON.stringify(options))
  let mentions: string[] = []
  let quoteId: string | undefined
  if (Array.isArray(options)) {
    mentions = options
  } else {
    mentions = options.mentionIdList || []
    quoteId = options.quoteId
  }
  const waMessageSendOptions: MessageSendOptions = {}
  if (mentions.length > 0) {
    const contacts = await Promise.all(mentions.map((v) => (
      this.manager.getContactById(v)
    )))
    waMessageSendOptions.mentions = contacts
  }

  if (quoteId) {
    const quotedMessage = await this.messageRawPayload(quoteId)
    waMessageSendOptions.quotedMessageId = quotedMessage.id._serialized
  }
  return messageSend.call(this, conversationId, text, waMessageSendOptions, DEFAULT_TIMEOUT.MESSAGE_SEND_TEXT)
}

export async function messageSendFile (this: PuppetWhatsApp, conversationId: string, file: FileBox, options?: MessageSendOptions): Promise<void | string> {
  log.verbose(PRE, 'messageSendFile(%s, %s)', conversationId, file.name)
  await file.ready()
  const type = (file.mediaType && file.mediaType !== 'application/octet-stream')
    ? file.mediaType.replace(/;.*$/, '')
    : path.extname(file.name)
  log.silly(PRE, `message type: ${type}, filename: ${file.name}`)
  const fileBoxJsonObject: any = file.toJSON() // FIXME: need import FileBoxJsonObject from file-box
  const remoteUrl = fileBoxJsonObject.url
  let msgContent
  if (remoteUrl) {
    msgContent = await MessageMedia.fromUrl(remoteUrl, { filename: file.name })
  } else {
    const fileData = await file.toBase64()
    msgContent = new MessageMedia(file.mediaType!, fileData, file.name)
  }
  return messageSend.call(this, conversationId, msgContent, options, DEFAULT_TIMEOUT.MESSAGE_SEND_FILE)
}

export async function messageSendContact (this: PuppetWhatsApp, conversationId: string, contactId: string, options?: MessageSendOptions): Promise<void> {
  log.verbose(PRE, 'messageSendContact(%s, %s)', conversationId, contactId)

  const contact = await this.manager.getContactById(contactId)
  await messageSend.call(this, conversationId, contact, options, DEFAULT_TIMEOUT.MESSAGE_SEND_TEXT)
}

export async function messageSendUrl (
  this: PuppetWhatsApp,
  conversationId: string,
  urlLinkPayload: PUPPET.payloads.UrlLink,
): Promise<string | void> {
  log.verbose(PRE, 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))

  const urlLink = new UrlLink(urlLinkPayload.url, urlLinkPayload.title, urlLinkPayload.description, urlLinkPayload.thumbnailUrl ? await MessageMedia.fromUrl(urlLinkPayload.thumbnailUrl) : undefined)
  return messageSend.call(this, conversationId, urlLink, {}, DEFAULT_TIMEOUT.MESSAGE_SEND_TEXT)
}

export async function messageSendMiniProgram (this: PuppetWhatsApp, conversationId: string, miniProgramPayload: PUPPET.payloads.MiniProgram): Promise<string | void> {
  log.verbose(PRE, 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))

  if (!miniProgramPayload.username || !miniProgramPayload.appid) {
    throw new Error('a miniProgramPayload must have username and appid')
  }
  const productMessage = new ProductMessage(miniProgramPayload.username, miniProgramPayload.appid, miniProgramPayload.title, miniProgramPayload.description, miniProgramPayload.thumbUrl ? await MessageMedia.fromUrl(miniProgramPayload.thumbUrl) : undefined)
  return messageSend.call(this, conversationId, productMessage, {}, DEFAULT_TIMEOUT.MESSAGE_SEND_TEXT)
}

export async function messageSendChannel (this: PuppetWhatsApp, conversationId: string, channelPayload: PUPPET.payloads.Channel): Promise<void> {
  log.verbose(PRE, 'messageSendChannel(%s, %s)', conversationId, JSON.stringify(channelPayload))
  return PUPPET.throwUnsupportedError()
}

export async function messageSendLocation (this: PuppetWhatsApp, conversationId: string, locationPayload: PUPPET.payloads.Location): Promise<string> {
  log.verbose(PRE, 'messageSendLocation(%s, %s)', conversationId, JSON.stringify(locationPayload))
  throw PUPPET.throwUnsupportedError()

  // const location = new Location(locationPayload.latitude, locationPayload.longitude, `${locationPayload.name}\n${locationPayload.address}`)
  // return messageSend.call(this, conversationId, location)

  // can send via whatsapp-web.js, however whatsapp-web itself does not offer location sending, so that the message cannot reach the server
}

export async function messageLocation (this: PuppetWhatsApp, messageId: string): Promise<PUPPET.payloads.Location> {
  log.verbose(PRE, 'messageLocation(%s)', messageId)

  const msg = await this.messageRawPayload(messageId)
  if (msg.type !== MessageTypes.LOCATION) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_MATCH, `Message ${messageId} is not a location message`)
  }

  return {
    accuracy: 15,
    address: msg.location?.description?.split('\n')[1] || '',
    latitude: Number(msg.location?.latitude || 0),
    longitude: Number(msg.location?.longitude || 0),
    name: msg.location?.description?.split('\n')[0] || '',
  }
}

export async function messageForward (this: PuppetWhatsApp, conversationId: string, messageId: string): Promise<void> {
  log.verbose(PRE, 'messageForward(%s, %s)', conversationId, messageId)
  const cacheManager = await this.manager.getCacheManager()
  const msg = await cacheManager.getMessageRawPayload(messageId)
  if (!msg) {
    log.error(PRE, 'Message %s not found', messageId)
    throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Message ${messageId} not found`)
  }
  const msgObj = convertMessagePayloadToClass(this.manager.getWhatsAppClient(), msg)
  try {
    await msgObj.forward(conversationId)
  } catch (error) {
    throw WAError(WA_ERROR_TYPE.ERR_MSG_FORWARD, `Forward message: ${messageId} failed, error: ${(error as Error).message}`)
  }
}

export async function messageRawPayload (this: PuppetWhatsApp, id: string): Promise<WhatsAppMessagePayload> {
  log.verbose(PRE, 'messageRawPayload(%s)', id)
  const cacheManager = await this.manager.getCacheManager()
  let msg = await cacheManager.getMessageRawPayload(id)
  if (msg) {
    return msg
  }
  msg = await this.manager.getMessageWithId(id)
  if (msg) {
    msg.timestamp = Date.now()
    await cacheManager.setMessageRawPayload(id, msg)
    return msg
  }
  throw WAError(WA_ERROR_TYPE.ERR_MSG_NOT_FOUND, `Can not find this message: ${id}`)
}

export async function messageRawPayloadParser (this: PuppetWhatsApp, whatsAppPayload: WhatsAppMessagePayload): Promise<PUPPET.payloads.Message> {
  const result = parserMessageRawPayload(whatsAppPayload)
  log.verbose(PRE, 'messageRawPayloadParser whatsAppPayload(%s) result(%s)', JSON.stringify(whatsAppPayload), JSON.stringify(result))
  return result
}
