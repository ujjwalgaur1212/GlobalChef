export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

export type SignupFormValues = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type ForgotPasswordFormValues = {
  email: string;
};
