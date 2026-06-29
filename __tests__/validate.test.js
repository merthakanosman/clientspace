import { describe, expect, it } from 'vitest'
import {
  firstError,
  sanitizeClient,
  sanitizeNote,
  sanitizeProject,
  validateClient,
  validateNote,
  validateProject,
} from '../lib/validate.js'

describe('validation helpers', () => {
  it('sanitizes client fields and normalizes email', () => {
    const result = sanitizeClient({
      name: '  <Acme> Agency  ',
      email: '  OWNER@EXAMPLE.COM  ',
      company: '<Studio>',
      phone: '<555-123>',
    })

    expect(result).toEqual({
      name: 'Acme Agency',
      email: 'owner@example.com',
      company: 'Studio',
      phone: '555-123',
    })
  })

  it('validates required client fields and email format', () => {
    expect(validateClient({ name: '', email: 'bad', company: '', phone: '' })).toMatchObject({
      name: 'Ad zorunludur.',
      email: 'Geçerli bir email adresi girin.',
    })
  })

  it('validates project status, budget, and date', () => {
    const errors = validateProject({
      title: '',
      status: 'blocked',
      budget: '-10',
      deadline: 'not-a-date',
    })

    expect(errors).toMatchObject({
      title: 'Başlık zorunludur.',
      status: 'Geçersiz durum değeri.',
      budget: 'Bütçe pozitif bir sayı olmalıdır.',
      deadline: 'Geçerli bir tarih girin.',
    })
  })

  it('sanitizes project text fields without changing allowed status', () => {
    const result = sanitizeProject({
      title: ' <Landing Page> ',
      description: ' <Build MVP> ',
      status: 'in_progress',
      budget: '12000',
    })

    expect(result.title).toBe('Landing Page')
    expect(result.description).toBe('Build MVP')
    expect(result.status).toBe('in_progress')
  })

  it('validates and sanitizes notes', () => {
    expect(sanitizeNote(' <Call summary> ')).toBe('Call summary')
    expect(validateNote('')).toBe('Not içeriği zorunludur.')
    expect(validateNote('x'.repeat(1001))).toBe('Not en fazla 1000 karakter olabilir.')
    expect(validateNote('Valid note')).toBeNull()
  })

  it('returns the first validation error', () => {
    expect(firstError({ email: 'Email zorunludur.', name: 'Ad zorunludur.' })).toBe('Email zorunludur.')
    expect(firstError({})).toBeNull()
  })
})
