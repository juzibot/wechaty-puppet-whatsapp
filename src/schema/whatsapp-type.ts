import type * as WhatsApp from '@juzi/whatsapp-web.js'
import type { SetOptional } from 'type-fest'

export type {
  Client as WhatsAppClientType,
  ClientInfo,
  ClientInfoPhone,
  ClientOptions,
  ClientSession,
  BatteryInfo,
  CreateGroupResult,
  // GroupNotification,
  ChatTypes,
  Events,
  MessageAck as MessageAckType,
  Status,
  WAState as WAStateType,
  MessageInfo,
  InviteV4Data,
  Message as WhatsAppMessage,
  // MessageId,
  Location,
  Label,
  MessageSendOptions,
  MediaFromURLOptions,
  // MessageMedia,
  MessageContent,
  Contact as WhatsAppContact,
  ContactId,
  BusinessContact,
  PrivateContact,
  Chat,
  MessageSearchOptions,
  ChatId,
  PrivateChat,
  GroupParticipant,
  ChangeParticipantsPermissions,
  // GroupChat,
  ProductMetadata,
  Product,
  Order,
  Payment,
  Call,
  Buttons,
  Row,
  List,
} from '@juzi/whatsapp-web.js'

export interface MessageId {
  fromMe: boolean,
  remote: string | {
    server: string
    user: string
    _serialized: string,
  },
  id: string,
  _serialized: string,
}
export type WhatsAppContactPayload = {
  avatar: string
} & Omit<WhatsApp.Contact, 'getProfilePicUrl' | 'getChat' | 'getCountryCode' | 'getFormattedNumber' | 'block' | 'unblock' | 'getAbout'>
export type WhatsAppMessagePayload = SetOptional<{mentionedIds: string[], location?: WhatsApp.Location, orderId?: string, id: MessageId, _data?: any} & Omit<WhatsApp.Message, 'id' | 'orderId' | 'location' | 'mentionedIds' | 'acceptGroupV4Invite' | 'delete' | 'downloadMedia' | 'getChat' | 'getContact' | 'getMentions' | 'getQuotedMessage' | 'reply' | 'forward' | 'star' | 'unstar' | 'getInfo' | 'getOrder' | 'getPayment' | 'duration' | 'rawData' | 'reload' | 'react' | 'hasReaction' | 'getReactions' | 'edit' |'getGroupMentions' | 'pin' | 'unpin'>, 'urlLink' | 'productMessage' | 'editScheduledEvent' | 'eventStartTime' | 'isEventCaneled' | 'getPollVotes' | 'vote'>
export interface GroupMetadata {
  desc: string
  owner: WhatsApp.ContactId
  participants: WhatsApp.GroupParticipant[]
}
export type GroupChat = {groupMetadata:GroupMetadata} & SetOptional<WhatsApp.GroupChat, 'owner'>
export interface GroupNotificationId {
  fromMe: boolean,
  remote: string,
  id: string,
  participant?: string,
  _serialized: string,
}

export type GroupNotification = {id: GroupNotificationId} & Omit<WhatsApp.GroupNotification, 'id'>
