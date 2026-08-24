import { describe, it, expect } from 'vitest'
import { classifyFailure } from '../src/index'

const withCode = (msg: string, code: string) => Object.assign(new Error(msg), { code })

describe('classifyFailure — permanent', () => {
  it('treats SQLSTATE class 23 (integrity constraint) as permanent', () => {
    expect(classifyFailure(withCode('duplicate key', '23505'))).toBe('permanent')
  })
  it('treats SQLSTATE class 22 (data exception) as permanent', () => {
    expect(classifyFailure(withCode('numeric out of range', '22003'))).toBe('permanent')
  })
  it('treats SQLSTATE class 42 (syntax/access) as permanent', () => {
    expect(classifyFailure(withCode('column does not exist', '42703'))).toBe('permanent')
  })
  it('treats programming errors as permanent', () => {
    expect(classifyFailure(new TypeError('x is not a function'))).toBe('permanent')
    expect(classifyFailure(new ReferenceError('x is not defined'))).toBe('permanent')
  })
  it('treats letter-subclass codes in permanent classes as permanent', () => {
    expect(classifyFailure(withCode('undefined table', '42P01'))).toBe('permanent')
    expect(classifyFailure(withCode('exclusion violation', '23P01'))).toBe('permanent')
    expect(classifyFailure(withCode('invalid text representation', '22P02'))).toBe('permanent')
  })
})

describe('classifyFailure — transient by default', () => {
  // Real connection failures from serverless Postgres drivers look like
  // this: plain Errors with no .code at all. A classifier that defaults
  // unknown errors to permanent turns exactly these into
  // charge-with-nothing-delivered.
  it('treats a code-less connection error as transient', () => {
    expect(classifyFailure(new Error(
      'Client has encountered a connection error and is not queryable'))).toBe('transient')
    expect(classifyFailure(new Error('Connection terminated'))).toBe('transient')
    expect(classifyFailure(new Error(
      'Connection terminated due to connection timeout'))).toBe('transient')
  })
  it('treats an unrecognised SQLSTATE as transient', () => {
    expect(classifyFailure(withCode('lock not available', '55P03'))).toBe('transient')
    expect(classifyFailure(withCode('too many connections', '53300'))).toBe('transient')
  })
  it('treats non-Error values as transient', () => {
    expect(classifyFailure('boom')).toBe('transient')
    expect(classifyFailure(null)).toBe('transient')
    expect(classifyFailure(undefined)).toBe('transient')
    expect(classifyFailure({ code: 23505 })).toBe('transient') // numeric code, not a string
  })
  it('treats an object with no code as transient', () => {
    expect(classifyFailure({})).toBe('transient')
    expect(classifyFailure(new Error('some driver failure'))).toBe('transient')
  })
})
