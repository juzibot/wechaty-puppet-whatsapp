import * as PUPPET from '@juzi/wechaty-puppet'
import { SPECIAL_BOT_PUSHNAME } from '../../config.js'

import type { WhatsAppContactPayload } from '../../schema/whatsapp-type.js'
import { ContactStatus } from '../../schema/contact.js'

export function parserContactRawPayload (contactPayload: WhatsAppContactPayload, userName?: string): PUPPET.payloads.Contact {
  let type
  if (contactPayload.isUser) {
    type = PUPPET.types.Contact.Individual
  } else if (contactPayload.isEnterprise) {
    type = PUPPET.types.Contact.Corporation
  } else {
    type = PUPPET.types.Contact.Unknown
  }
  let name

  const isFriend = contactPayload.isMyContact || contactPayload.isMe

  const additionalInfo: any = {
    status: isFriend ? ContactStatus.FRIEND : ContactStatus.NOT_FRIEND,
  }

  if (contactPayload.isMe) {
    name = userName || contactPayload.pushname
    if (name === SPECIAL_BOT_PUSHNAME) {
      name = contactPayload.shortName
    }

    additionalInfo.corpId = contactPayload.id._serialized
    additionalInfo.sCorpId = contactPayload.id._serialized
    additionalInfo.corpName = `${contactPayload.isBusiness ? 'Whatsapp Business' : 'Whatsapp'}:${contactPayload.id._serialized}`

  } else {
    /**
     * 在 iOS 中， pushname 是联系人自己设置的名字， name 是bot通讯录中联系人的名字
     * 在 Android 中， pushname 是 undefined ， name 是bot通讯录中联系人的名字
     * 因此应该优先使用 name
     */
    name = contactPayload.name || contactPayload.pushname
  }

  const number = contactPayload.number || contactPayload.id.user

  return {
    avatar: contactPayload.avatar,
    friend: isFriend,
    gender: PUPPET.types.ContactGender.Unknown,
    id: contactPayload.id._serialized,
    name: name || contactPayload.id._serialized,
    phone: [number],
    type: type,
    handle: number,
    weixin: number,
    additionalInfo: JSON.stringify(additionalInfo),
  }
}
