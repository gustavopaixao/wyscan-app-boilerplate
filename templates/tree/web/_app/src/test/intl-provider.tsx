import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import en from "../../messages/en.json";

type Props = {
  children: ReactNode;
};

export const IntlTestProvider = ({ children }: Props) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {children}
  </NextIntlClientProvider>
);
