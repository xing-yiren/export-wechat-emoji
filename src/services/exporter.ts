import {
  createDir,
  writeBinaryFile,
  writeTextFile,
  exists,
  BaseDirectory
} from '@tauri-apps/api/fs'
import { join } from '@tauri-apps/api/path'
import { Command } from '@tauri-apps/api/shell'
import { getUrlParam } from '../utils/url'

function fsOptionsForPath(path: string) {
  return path.startsWith('/') ? {} : { dir: BaseDirectory.Download }
}

export async function ensureExportRootDir(customEmotionsDirName: string) {
  await createDir(customEmotionsDirName, {
    ...fsOptionsForPath(customEmotionsDirName),
    recursive: true
  })
}

export async function writeUsageReadme(
  customEmotionsDirName: string,
  content: string
) {
  const metaDir = `${customEmotionsDirName}/导出信息`
  await createDir(metaDir, {
    ...fsOptionsForPath(metaDir),
    recursive: true
  })
  await writeTextFile(`${metaDir}/使用说明.txt`, content, {
    ...fsOptionsForPath(metaDir)
  })
}

export async function writeUrlsFile(
  customEmotionsDirName: string,
  urls: Array<string>
) {
  const metaDir = `${customEmotionsDirName}/导出信息`
  await createDir(metaDir, {
    ...fsOptionsForPath(metaDir),
    recursive: true
  })
  const content = `${urls.join('\n')}\n`
  await writeTextFile(`${metaDir}/emoticon_urls.txt`, content, {
    ...fsOptionsForPath(metaDir)
  })
}

export async function writeDbKeyFile(
  customEmotionsDirName: string,
  dbKey: string
) {
  const metaDir = `${customEmotionsDirName}/导出信息`
  await createDir(metaDir, {
    ...fsOptionsForPath(metaDir),
    recursive: true
  })
  const content = `${dbKey.trim()}\n`
  await writeTextFile(`${metaDir}/emoticon_dbkey.txt`, content, {
    ...fsOptionsForPath(metaDir)
  })
}

export function exportFileKey(usedUrl: string, index: number): string {
  const m = getUrlParam(usedUrl, 'm')
  if (m) {
    return m
  }
  // Avoid "null.xxx" and keep ordering stable for the same URL list.
  return String(index + 1).padStart(6, '0')
}

export function buildUniqueFileKeys(urls: Array<string>): Array<string> {
  const counts = new Map<string, number>()
  return urls.map((u, i) => {
    const base = exportFileKey(u, i)
    const n = (counts.get(base) || 0) + 1
    counts.set(base, n)
    if (n === 1) {
      return base
    }
    // Avoid overwriting when `m` duplicates; keep it readable.
    return `${base}_${n}`
  })
}

export function groupSubDirPath(
  customEmotionsDirName: string,
  index: number,
  groupSize: number
): { subDirNumber: number; subDirPath: string } {
  if (!groupSize) {
    return { subDirNumber: 0, subDirPath: customEmotionsDirName }
  }
  const subDirNumber = Math.floor(index / groupSize)
  const start = subDirNumber * groupSize + 1
  const end = (subDirNumber + 1) * groupSize
  const subDirPath = `${customEmotionsDirName}/${start}_${end}_组`
  return { subDirNumber, subDirPath }
}

export async function exportedEmojiExists(options: {
  customEmotionsDirName: string
  groupSize: number
  index: number
  usedUrl: string
}): Promise<boolean> {
  const key = exportFileKey(options.usedUrl, options.index)
  return await exportedEmojiExistsByKey({
    customEmotionsDirName: options.customEmotionsDirName,
    groupSize: options.groupSize,
    index: options.index,
    fileKey: key
  })
}

export async function exportedEmojiExistsByKey(options: {
  customEmotionsDirName: string
  groupSize: number
  index: number
  fileKey: string
}): Promise<boolean> {
  const { subDirPath } = groupSubDirPath(
    options.customEmotionsDirName,
    options.index,
    options.groupSize
  )
  const key = options.fileKey
  const exts = ['gif', 'jpg', 'png', 'webp'] as const
  for (const ext of exts) {
    const p = `${subDirPath}/${key}.${ext}`
    if (await exists(p, fsOptionsForPath(p))) {
      return true
    }
  }
  return false
}

export async function exportOneEmoji(options: {
  customEmotionsDirName: string
  groupSize: number
  createdSubDirs: Set<number>
  index: number
  usedUrl: string
  fileKey?: string
  buffer: ArrayBuffer
  ext: string
}) {
  const { subDirNumber, subDirPath } = groupSubDirPath(
    options.customEmotionsDirName,
    options.index,
    options.groupSize
  )

  if (options.groupSize) {
    if (!options.createdSubDirs.has(subDirNumber)) {
      options.createdSubDirs.add(subDirNumber)
      await createDir(subDirPath, {
        ...fsOptionsForPath(subDirPath),
        recursive: true
      })
    }
  }

  const fileKey =
    options.fileKey || exportFileKey(options.usedUrl, options.index)
  await writeBinaryFile(
    `${subDirPath}/${fileKey}.${options.ext}`,
    new Uint8Array(options.buffer),
    fsOptionsForPath(subDirPath)
  )
}

export async function openExportDir(
  downloadDirPath: string,
  customEmotionsDirName: string
) {
  const path = customEmotionsDirName.startsWith('/')
    ? customEmotionsDirName
    : customEmotionsDirName
      ? await join(downloadDirPath, customEmotionsDirName)
      : downloadDirPath
  await new Command('open-dir', [path]).execute()
}
