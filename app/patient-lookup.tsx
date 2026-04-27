import { Redirect } from 'expo-router';

/** @deprecated Use `/patient-intake` — single-page visit flow */
export default function PatientLookupRedirect() {
  return <Redirect href="/patient-intake" />;
}
