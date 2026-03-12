import type * as PUPPET from '@juzi/wechaty-puppet'
import type {  } from '@juzi/whatsapp-web.js'
import type {
  GroupNotification,
  WhatsAppContactPayload,
} from '../../schema/whatsapp-type.js'

export function genRoomTopicEvent (notification: GroupNotification, roomPayload: WhatsAppContactPayload) {
  const roomIdObj = notification.id
  const roomId = roomIdObj.remote
  const roomTopicPayload: PUPPET.payloads.EventRoomTopic = {
    changerId: notification.author,
    newTopic: notification.body,
    oldTopic: roomPayload.name || '',
    roomId,
    timestamp: notification.timestamp,
  }
  return roomTopicPayload
}

export function genRoomJoinEvent (notification: GroupNotification, members: string[]) {
  const roomIdObj = notification.id
  const roomId = roomIdObj.remote
  const roomJoinPayload: PUPPET.payloads.EventRoomJoin = {
    inviteeIdList: members,
    inviterId: notification.author,
    roomId,
    timestamp: notification.timestamp,
  }
  return roomJoinPayload
}
