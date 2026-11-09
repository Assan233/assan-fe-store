/** Shared requirements for forms that set a new account password. */
export const passwordRequirement = '至少 8 位，包含大写字母、小写字母、数字和特殊字符'
export const newPasswordAttributes = {
  minLength: 8,
  maxLength: 128,
  pattern: String.raw`(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[\p{P}\p{S}]).{8,128}`,
  title: passwordRequirement,
}
