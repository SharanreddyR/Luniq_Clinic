import { Redirect } from 'expo-router';

/** @deprecated Use `/patient-intake` — visit record is saved from there */
export default function OpdRedirect() {
  return <Redirect href="/patient-intake" />;
}
