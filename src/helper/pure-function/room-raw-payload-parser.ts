import type * as PUPPET from '@juzi/wechaty-puppet'
import { WA_ERROR_TYPE } from '../../exception/error-type.js'
import WAError from '../../exception/whatsapp-error.js'
import { widLikeToIdString } from '../miscellaneous.js'
import type { WhatsAppContactPayload as RoomPayload, GroupChat } from '../../schema/whatsapp-type.js'

export function parserRoomRawPayload (roomPayload: RoomPayload, roomChat: GroupChat): PUPPET.payloads.Room {
  const roomId = roomPayload.id._serialized
  if (roomChat.participants.length === 0) {
    throw WAError(WA_ERROR_TYPE.ERR_ROOM_NOT_FOUND, `roomRawPayloadParser(${roomId}) can not get chat info for this room.`)
  }
  // 成员/owner id 统一走 widLikeToIdString 提取:LID 灰度下页面序列化的 id
  // 形态不定,裸读 _serialized 会产出 undefined 污染 payload,
  // 下游 wechaty 逐成员 Contact.find 会全部失败
  return {
    adminIdList: roomChat.participants
      .filter(m => m.isAdmin || m.isSuperAdmin)
      .map(m => widLikeToIdString(m.id))
      .filter((id): id is string => !!id),
    avatar: roomPayload.avatar,
    id: roomId,
    memberIdList: roomChat.participants
      .map(m => widLikeToIdString(m.id))
      .filter((id): id is string => !!id),
    ownerId: widLikeToIdString(roomChat.owner),
    topic: roomPayload.name || roomPayload.pushname || '',
  }
}
