export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  dateStart: string;
  dateEnd: string | null;
  description: string;
  tags: string[];
}
