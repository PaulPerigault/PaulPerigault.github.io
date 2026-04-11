export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuerLogo: string;
  dateIssued: string | null;
  dateExpires: string | null;
  inProgress: boolean;
  credlyUrl?: string;
}
