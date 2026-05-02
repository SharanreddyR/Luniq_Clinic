import type { ClinicVisitCatalogItem } from '@/services/visitService';

/**
 * Shown when GET /clinic/services returns an empty list and
 * {@link USE_MOCK_CLINIC_SERVICES_WHEN_EMPTY} is enabled — UI testing only.
 * Submit is disabled while these are shown (ids are not real `clinic_services` rows).
 */
export const MOCK_CLINIC_VISIT_CATALOG: ClinicVisitCatalogItem[] = [
  {
    id: 90001,
    name: 'Consultation',
    slug: 'consultation',
    price: 300,
    icon: null,
  },
  {
    id: 90002,
    name: 'Medicine',
    slug: 'medicine',
    price: 500,
    icon: null,
  },
  {
    id: 90003,
    name: 'Lab test',
    slug: 'lab-test',
    price: 350,
    icon: null,
  },
];
