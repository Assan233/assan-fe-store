import { expect, it } from 'vitest'
import { newPasswordAttributes } from './password'

it('requires at least eight characters with all four character categories', () => {
  const pattern = new RegExp(`^(?:${newPasswordAttributes.pattern})$`, 'u')
  expect(pattern.test('Abcdef1!')).toBe(true)
  for (const password of ['Abcde1!', 'abcdef1!', 'ABCDEF1!', 'Abcdefg!', 'Abcdef12', 'Abcdef1 ', 'Abcdef1中']) {
    expect(pattern.test(password), password).toBe(false)
  }
})
