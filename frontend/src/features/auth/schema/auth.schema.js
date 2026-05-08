import * as yup from 'yup';

// Định nghĩa các luật chung
const emailRule = yup.string()
  .required('Email không được để trống.')
  .email('Vui lòng nhập đúng định dạng email.')
  .matches(/@gmail\.com$/, 'Chỉ chấp nhận email đuôi @gmail.com.');

const loginPasswordRule = yup.string()
  .required('Mật khẩu không được để trống.')
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.');

const signupPasswordRule = yup.string()
  .required('Mật khẩu không được để trống.')
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
  .matches(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa.')
  .matches(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số.');

const confirmPasswordRule = yup.string()
  .required('Vui lòng xác nhận lại mật khẩu.')
  .oneOf([yup.ref('password'), null], 'Mật khẩu xác nhận không khớp.');


// Ráp thành các schema
// Trang Login: Cần cả Email và Password
export const loginSchema = yup.object().shape({
  email: emailRule,
  password: loginPasswordRule
});

// Trang Quên mật khẩu: Chỉ cần Email
export const forgotPasswordSchema = yup.object().shape({
  email: emailRule
});

// Trang Đặt lại mật khẩu: Cần Password mới và Xác nhận Password
export const resetPasswordSchema = yup.object().shape({
  password: signupPasswordRule,
  confirmPassword: confirmPasswordRule
});