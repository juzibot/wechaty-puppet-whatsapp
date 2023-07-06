import { FileBoxType, FileBoxInterface } from 'file-box'
import { MessageMedia } from '../../schema/whatsapp-interface.js'
import { v4 as uuidV4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { TEMP_FILE_PATH } from '../../config.js'

export const getMessageMediaFromFilebox = async (fileBox: FileBoxInterface) => {
  if (fileBox.type === FileBoxType.Url) {
    return await MessageMedia.fromUrl((fileBox as any).remoteUrl)
  } else {
    const localPath = path.join(
      TEMP_FILE_PATH,
      uuidV4(),
    )
    await fileBox.toFile(localPath, true)
    const media = await MessageMedia.fromFilePath(localPath)
    fs.rmSync(localPath)
    return media
  }
}
