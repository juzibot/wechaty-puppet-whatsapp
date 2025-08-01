/// <reference path="./typings.d.ts" />
import {
  MessageTypes as WhatsAppMessageType,
} from './schema/whatsapp-interface.js'
import { packageJson } from './package-json.js'

import os from 'os'
import path from 'path'
import { mkdirpSync } from 'fs-extra'
export { log } from '@juzi/wechaty-puppet'
export {
  FileBox,
  FileBoxType,
  type FileBoxInterface,
} from 'file-box'

const VERSION = packageJson.version || '0.0.0'

const MEMORY_SLOT = 'PUPPET_WHATSAPP_CLIENT_ID'
const PRE = 'PuppetWhatsApp'

export const SPECIAL_BOT_PUSHNAME = '-' // FIXME: pushname is '-', see: https://github.com/wechaty/puppet-whatsapp/issues/233

export const MIN_BATTERY_VALUE_FOR_LOGOUT = Number(process.env['MIN_BATTERY_VALUE_FOR_LOGOUT']) || 1

export const TEMP_FILE_PATH = path.join(
  os.homedir(),
  '.wechaty',
  'puppet-whatsapp',
  'temp',
)

mkdirpSync(TEMP_FILE_PATH)

export const MessageMediaTypeList = [
  // WhatsAppMessageType.CONTACT_CARD_MULTI,
  WhatsAppMessageType.AUDIO,
  WhatsAppMessageType.VOICE,
  WhatsAppMessageType.IMAGE,
  WhatsAppMessageType.VIDEO,
  WhatsAppMessageType.DOCUMENT,
  WhatsAppMessageType.STICKER,
]

export {
  MEMORY_SLOT,
  VERSION,
  PRE,
}

export const STRINGS = {
  en_US: {
    DEFAULT_HELLO_MESSAGE: 'Hello, I\'m your new WhatsApp friend!',
    LOGOUT_REASON: {
      BATTERY_LOWER_IN_PHONE: 'Low battery on your phone, please plug into power source',
      DEFAULT: 'Logged out',
      LOGIN_CONFLICT: 'Logged in on other device',
      NETWORK_TIMEOUT_IN_PHONE: 'WhatsApp connect to your phone',
    },
  },
  zh_CN: {
    DEFAULT_HELLO_MESSAGE: '你好，我是你的新WhatsApp好友！',
    LOGOUT_REASON: {
      BATTERY_LOWER_IN_PHONE: '手机电量过低，即将无法继续使用WhatsApp',
      DEFAULT: '已退出登录',
      LOGIN_CONFLICT: '已在其他设备上登录',
      NETWORK_TIMEOUT_IN_PHONE: '手机端网络连接异常',
    },
  },
}

type LangCodes = keyof typeof STRINGS

export const LANGUAGE: LangCodes = process.env['LANGUAGE'] as LangCodes | undefined || 'zh_CN'

export const DEFAULT_TIMEOUT = {
  MESSAGE_SEND: 120 * 1000, // should allow long waiting time since connection breaks a log (maybe even no timeout limit?)
  MESSAGE_SEND_FILE: 15 * 60 * 1000,
  MESSAGE_SEND_TEXT: 120 * 1000,
  TIMEOUT_WAIT_CONNECTED: 10 * 1000,
}

export const HISTORY_MESSAGES_DAYS = Number(process.env['HISTORY_MESSAGES_DAYS'] || '3')
export const MAX_HEARTBEAT_MISSED = Number(process.env['MAX_HEARTBEAT_MISSED'] || '3')
