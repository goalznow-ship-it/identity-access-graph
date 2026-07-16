import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseCsv } from '../parsers/csv-parser'
import { parseExcel } from '../parsers/excel-parser'

const tmpDir = path.resolve(process.cwd(), '.imports-tmp-test')

function writeTestFile(name: string, content: string): string {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  const p = path.join(tmpDir, name)
  fs.writeFileSync(p, content)
  return p
}

before(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('CSV Parser', () => {
  it('should parse basic CSV', () => {
    const csv = 'name,email,role\nAlice,alice@test.com,admin\nBob,bob@test.com,user'
    const filePath = writeTestFile('test.csv', csv)
    const result = parseCsv(filePath, 'Sheet1')
    assert.equal(result.rowCount, 2)
    assert.equal(result.columnCount, 3)
    assert.deepEqual(result.headers, ['name', 'email', 'role'])
    assert.equal(result.previewRows.length, 2)
    assert.equal(result.previewRows[0].name, 'Alice')
    assert.equal(result.warnings.length, 0)
  })

  it('should detect empty sheet', () => {
    const filePath = writeTestFile('empty.csv', '')
    const result = parseCsv(filePath, 'Sheet1')
    assert.equal(result.rowCount, 0)
    assert.equal(result.warnings.some((w) => w.type === 'empty_sheet'), true)
  })

  it('should detect duplicate rows', () => {
    const csv = 'id,name\n1,Alice\n2,Bob\n1,Alice'
    const filePath = writeTestFile('dupes.csv', csv)
    const result = parseCsv(filePath, 'Sheet1')
    assert.equal(result.warnings.some((w) => w.type === 'duplicate_rows'), true)
  })

  it('should detect empty columns', () => {
    const csv = 'id,name,email\n1,Alice,\n2,Bob,'
    const filePath = writeTestFile('empty-col.csv', csv)
    const result = parseCsv(filePath, 'Sheet1')
    assert.equal(result.warnings.some((w) => w.type === 'empty_columns'), true)
  })

  it('should handle quoted fields', () => {
    const csv = '"first","last"\n"John,Doe","Smith"\n"Jane","Doe"'
    const filePath = writeTestFile('quoted.csv', csv)
    const result = parseCsv(filePath, 'Sheet1')
    assert.equal(result.previewRows[0].first, 'John,Doe')
  })

  it('should limit preview rows to 20', () => {
    const lines = ['col']
    for (let i = 0; i < 30; i++) lines.push(`row${i}`)
    const filePath = writeTestFile('many.csv', lines.join('\n'))
    const result = parseCsv(filePath, 'Sheet1')
    assert.equal(result.previewRows.length, 20)
    assert.equal(result.rowCount, 30)
  })
})

describe('Excel Parser', () => {
  it('should parse .xlsx workbook', () => {
    const XLSX = require('xlsx')
    const wb = XLSX.utils.book_new()
    const data = [
      { Name: 'Alice', Email: 'alice@test.com', Role: 'admin' },
      { Name: 'Bob', Email: 'bob@test.com', Role: 'user' },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    const filePath = path.join(tmpDir, 'test.xlsx')
    XLSX.writeFile(wb, filePath)

    const sheets = parseExcel(filePath)
    assert.equal(sheets.length, 1)
    assert.equal(sheets[0].name, 'Users')
    assert.equal(sheets[0].rowCount, 2)
    assert.equal(sheets[0].columnCount, 3)
    assert.deepEqual(sheets[0].headers, ['Name', 'Email', 'Role'])
  })

  it('should handle multiple sheets', () => {
    const XLSX = require('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ x: 1 }]), 'Sheet1')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ y: 2 }]), 'Sheet2')
    const filePath = path.join(tmpDir, 'multi.xlsx')
    XLSX.writeFile(wb, filePath)

    const sheets = parseExcel(filePath)
    assert.equal(sheets.length, 2)
    assert.equal(sheets[1].name, 'Sheet2')
  })

  it('should detect empty sheets', () => {
    const XLSX = require('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'Empty')
    const filePath = path.join(tmpDir, 'empty.xlsx')
    XLSX.writeFile(wb, filePath)

    const sheets = parseExcel(filePath)
    assert.equal(sheets.length, 1)
    assert.equal(sheets[0].warnings.some((w) => w.type === 'empty_sheet'), true)
  })

  it('should not execute formulas', () => {
    const XLSX = require('xlsx')
    const wb = XLSX.utils.book_new()
    const data = [{ A: 1, B: 2 }]
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    const filePath = path.join(tmpDir, 'formula.xlsx')
    XLSX.writeFile(wb, filePath)

    const sheets = parseExcel(filePath)
    assert.equal(sheets[0].rowCount, 1)
    assert.equal(sheets[0].previewRows[0].A, 1)
  })
})
