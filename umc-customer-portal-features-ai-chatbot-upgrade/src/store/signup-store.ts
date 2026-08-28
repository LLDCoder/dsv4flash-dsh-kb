import create from 'zustand'
import { persist } from 'zustand/middleware'

export interface SignUpPhoneNumberValue {
    phoneCountryCode: string;
    phoneLocalNumber: string;
}

export const normalizeSignUpPhoneNumber = (
    phoneNumber: SignUpPhoneNumberValue | null | undefined,
): SignUpPhoneNumberValue => ({
    phoneCountryCode: String(
        phoneNumber?.phoneCountryCode || '',
    ).trim(),
    phoneLocalNumber: String(
        phoneNumber?.phoneLocalNumber || '',
    ).trim(),
});

export interface ISignUpData{
    firstName: string;
    lastName: string;
    phoneNumber: SignUpPhoneNumberValue;
    email: string;
    password: string;
    confirmPassword: string;
}

const initialValues: ISignUpData = {
    firstName: '',
    lastName: '',
    phoneNumber: {
        phoneCountryCode: '',
        phoneLocalNumber: '',
    },
    email: '',
    password: '',
    confirmPassword: '',
}

export function getSignupFullName(firstName?: string, lastName?: string) {
  return [firstName, lastName]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

export const useSignupStore = create(
  persist(
    (set) => ({
      ...initialValues,
      setEmail: (email: string) => set({ email }),
      setData: ({ firstName, lastName, phoneNumber, email, password, confirmPassword }: ISignUpData) => set({
        firstName,
        lastName,
        phoneNumber,
        email,
        password,
        confirmPassword
      }),
      reset: () => set(initialValues),
    }),
    {
      name: 'signup-storage', // name of the item in the storage (must be unique)
      getStorage: () => sessionStorage, // (optional) by default, 'localStorage' is used
    },
  ),
)
