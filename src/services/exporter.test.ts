import { describe, expect, it, vi } from 'vitest'
import {
  ensureExportRootDir,
  exportOneEmoji,
  exportedEmojiExistsByKey,
  openExportDir,
  writeUrlsFile
} from './exporter'

const mocks = vi.hoisted(() => ({
  createDir: vi.fn(async () => {}),
  writeBinaryFile: vi.fn(async () => {}),
  writeTextFile: vi.fn(async () => {}),
  exists: vi.fn(async () => false),
  openDir: vi.fn(async () => ({}))
}))

vi.mock('@tauri-apps/api/fs', () => ({
  BaseDirectory: { Download: 16 },
  createDir: mocks.createDir,
  writeBinaryFile: mocks.writeBinaryFile,
  writeTextFile: mocks.writeTextFile,
  exists: mocks.exists
}))

vi.mock('@tauri-apps/api/path', () => ({
  join: vi.fn(async (...parts: string[]) => parts.join('/'))
}))

vi.mock('@tauri-apps/api/shell', () => ({
  Command: class {
    constructor(
      public name: string,
      public args: string[]
    ) {}

    execute = mocks.openDir
  }
}))

describe('custom export path', () => {
  it('writes images and metadata using the selected absolute directory', async () => {
    const outputDir = '/Users/tester/Pictures/My Stickers/精选表情'
    await ensureExportRootDir(outputDir)
    await writeUrlsFile(outputDir, ['https://example.com/emoji.gif'])
    await exportOneEmoji({
      customEmotionsDirName: outputDir,
      groupSize: 50,
      createdSubDirs: new Set(),
      index: 0,
      usedUrl: 'https://example.com/stodownload?m=chosen',
      buffer: new Uint8Array([71, 73, 70]).buffer,
      ext: 'gif'
    })
    await exportedEmojiExistsByKey({
      customEmotionsDirName: outputDir,
      groupSize: 50,
      index: 0,
      fileKey: 'chosen'
    })
    await openExportDir('/Users/tester/Downloads', outputDir)

    expect(mocks.createDir).toHaveBeenCalledWith(outputDir, {
      recursive: true
    })
    expect(mocks.createDir).toHaveBeenCalledWith(`${outputDir}/1_50_组`, {
      recursive: true
    })
    expect(mocks.writeTextFile).toHaveBeenCalledWith(
      `${outputDir}/导出信息/emoticon_urls.txt`,
      'https://example.com/emoji.gif\n',
      {}
    )
    expect(mocks.writeBinaryFile).toHaveBeenCalledWith(
      `${outputDir}/1_50_组/chosen.gif`,
      expect.any(Uint8Array),
      {}
    )
    expect(mocks.exists).toHaveBeenCalledWith(
      `${outputDir}/1_50_组/chosen.gif`,
      {}
    )
    expect(mocks.openDir).toHaveBeenCalledTimes(1)
  })
})
