import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_SETTINGS_STORAGE_KEY,
  isValidExportFolderName,
  readExportSettings,
  writeExportSettings
} from './export-settings'

describe('export settings persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a complete V1 value', () => {
    const settings = {
      version: 1 as const,
      groupMode: 'custom' as const,
      customGroupSize: 24,
      resume: false,
      autoOpen: false
    }

    writeExportSettings(settings)

    expect(readExportSettings()).toEqual(settings)
    expect(
      JSON.parse(localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) || '')
    ).toEqual(settings)
  })

  it('persists a custom export directory and folder name', () => {
    writeExportSettings({
      ...DEFAULT_EXPORT_SETTINGS,
      saveDirectory: '/Users/tester/Pictures/My Stickers',
      folderName: '精选表情'
    })

    expect(readExportSettings()).toMatchObject({
      saveDirectory: '/Users/tester/Pictures/My Stickers',
      folderName: '精选表情'
    })
  })

  it('accepts one folder name and rejects path traversal', () => {
    expect(isValidExportFolderName('精选表情')).toBe(true)
    expect(isValidExportFolderName('')).toBe(true)
    expect(isValidExportFolderName('../其他目录')).toBe(false)
    expect(isValidExportFolderName('foo/bar')).toBe(false)
  })

  it('keeps valid fields and heals invalid fields independently', () => {
    localStorage.setItem(
      EXPORT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        groupMode: 'custom',
        customGroupSize: 12.9,
        resume: 'yes',
        autoOpen: false
      })
    )

    const expected = {
      version: 1,
      groupMode: 'custom',
      customGroupSize: 12,
      resume: true,
      autoOpen: false
    }
    expect(readExportSettings()).toEqual(expected)
    expect(
      JSON.parse(localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) || '')
    ).toEqual(expected)
  })

  it('replaces malformed JSON and unsupported versions with defaults', () => {
    localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEY, '{bad json')
    expect(readExportSettings()).toEqual(DEFAULT_EXPORT_SETTINGS)
    expect(
      JSON.parse(localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) || '')
    ).toEqual(DEFAULT_EXPORT_SETTINGS)

    localStorage.setItem(
      EXPORT_SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, groupMode: 'none' })
    )
    expect(readExportSettings()).toEqual(DEFAULT_EXPORT_SETTINGS)
    expect(
      JSON.parse(localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) || '')
    ).toEqual(DEFAULT_EXPORT_SETTINGS)
  })
})
