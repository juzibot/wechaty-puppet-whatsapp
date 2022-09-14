import * as PUPPET from '@juzi/wechaty-puppet'
import { log } from '../config.js'
import type PuppetWhatsApp from '../puppet-whatsapp.js'

const PRE = 'MIXIN_TAG'

export async function tagContactTagAdd (this: PuppetWhatsApp, tags: string[], contactIds: string[]): Promise <void> {
  log.verbose(PRE, 'tagContactTagAdd(%s, %s)', JSON.stringify(tags), contactIds)
  return PUPPET.throwUnsupportedError()
}

export async function tagContactTagRemove (this: PuppetWhatsApp, tags: string[], contactIds: string[]): Promise <void> {
  log.verbose(PRE, 'tagContactTagRemove(%s, %s)', JSON.stringify(tags), contactIds)
  return PUPPET.throwUnsupportedError()
}

export async function tagContactTagList (this: PuppetWhatsApp, contactId: string): Promise <string[] > {
  log.verbose(PRE, 'tagContactTagList(%s)', contactId)
  return PUPPET.throwUnsupportedError()
}

export async function tagGroupAdd (this: PuppetWhatsApp, groupName: string): Promise <string | void> {
  log.verbose(PRE, 'tagGroupAdd(%s)', groupName)
  return PUPPET.throwUnsupportedError()
}

export async function tagGroupDelete (this: PuppetWhatsApp, groupId: string): Promise <void> {
  log.verbose(PRE, 'tagGroupDelete(%s)', groupId)
  return PUPPET.throwUnsupportedError()
}

export async function tagGroupList (this: PuppetWhatsApp): Promise <string[] > {
  log.verbose(PRE, 'tagGroupList()')
  return PUPPET.throwUnsupportedError()
}

export async function tagGroupTagList (this: PuppetWhatsApp, groupId ?: string): Promise <string[] > {
  log.verbose(PRE, 'tagGroupTagList(%s)', groupId)
  return PUPPET.throwUnsupportedError()
}

export async function tagTagAdd (this: PuppetWhatsApp, tagName: string, groupId ?: string): Promise <string | void> {
  log.verbose(PRE, 'tagTagAdd(%s, %s)', tagName, groupId)
  return PUPPET.throwUnsupportedError()
}

export async function tagTagDelete (this: PuppetWhatsApp, tag: string): Promise <void> {
  log.verbose(PRE, 'tagTagDelete(%s)', JSON.stringify(tag))
  return PUPPET.throwUnsupportedError()
}

export async function tagTagList (this: PuppetWhatsApp): Promise <string[] > {
  log.verbose(PRE, 'tagTagList()')
  return PUPPET.throwUnsupportedError()
}

export async function tagTagContactList (this: PuppetWhatsApp, tag: string): Promise<string[]> {
  log.verbose(PRE, 'tagTagContactList(%s)', JSON.stringify(tag))
  return PUPPET.throwUnsupportedError()
}
