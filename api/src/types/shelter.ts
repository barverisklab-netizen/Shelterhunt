export interface ShelterRecord {
  id: string;
  code: string;
  share_code: string;
  external_id: string | null;
  sequence_no: number | null;
  name_en: string | null;
  name_jp: string | null;
  address: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}
