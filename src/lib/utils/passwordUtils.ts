export const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$£%^&+=?'~:;/.,*(){}]/;

export const PASSWORD_COMPLEXITY_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*${PASSWORD_SPECIAL_CHAR_REGEX.source}).{8,16}$`
);
