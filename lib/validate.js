const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed', 'cancelled'])

function sanitize(str, maxLen) {
  if (typeof str !== 'string') return ''
  return str.trim().replace(/[<>]/g, '').slice(0, maxLen)
}

export function sanitizeClient(form) {
  return {
    name:    sanitize(form.name,    100),
    email:   sanitize(form.email,   200).toLowerCase(),
    company: sanitize(form.company, 100),
    phone:   sanitize(form.phone,   20),
  }
}

export function validateClient(form) {
  const errors = {}
  if (!form.name)
    errors.name = 'Ad zorunludur.'
  if (!form.email)
    errors.email = 'Email zorunludur.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Geçerli bir email adresi girin.'
  if (form.phone && form.phone.length > 20)
    errors.phone = 'Telefon en fazla 20 karakter olabilir.'
  if (form.company && form.company.length > 100)
    errors.company = 'Şirket adı en fazla 100 karakter olabilir.'
  return errors
}

export function sanitizeProject(form) {
  return {
    ...form,
    title:       sanitize(form.title,       200),
    description: sanitize(form.description, 2000),
    status:      form.status,
  }
}

export function validateProject(form) {
  const errors = {}
  if (!form.title)
    errors.title = 'Başlık zorunludur.'
  if (!VALID_STATUSES.has(form.status))
    errors.status = 'Geçersiz durum değeri.'
  if (form.budget !== '' && form.budget !== null && form.budget !== undefined) {
    const b = parseFloat(form.budget)
    if (isNaN(b) || b < 0)
      errors.budget = 'Bütçe pozitif bir sayı olmalıdır.'
  }
  if (form.deadline) {
    const d = new Date(form.deadline)
    if (isNaN(d.getTime()))
      errors.deadline = 'Geçerli bir tarih girin.'
  }
  return errors
}

export function sanitizeNote(content) {
  return sanitize(content, 1000)
}

export function validateNote(content) {
  if (!content) return 'Not içeriği zorunludur.'
  if (content.length > 1000) return 'Not en fazla 1000 karakter olabilir.'
  return null
}

export function firstError(errors) {
  const keys = Object.keys(errors)
  return keys.length ? errors[keys[0]] : null
}
