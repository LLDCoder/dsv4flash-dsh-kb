import { readFileSync } from 'fs'

// Keep in sync with check-chinese.js (CJK Unified Ideographs range)
const chineseReg = /[\u4e00-\u9fa5]/

const path = process.argv[2]
if (!path) {
  console.error('❌ Missing commit message file path')
  process.exit(1)
}

const raw = readFileSync(path, 'utf-8')
const text = raw
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n')

if (chineseReg.test(text)) {
  console.error('❌ Commit message must not contain Chinese characters.')
  process.exit(1)
}
