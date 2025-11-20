export interface ShelterRecord {
  id: string;
  code: string;
  share_code: string;
  external_id: string | null;
  sequence_no: number | null;
  name_en: string | null;
  name_jp: string | null;
  address: string | null;
  address_en: string | null;
  address_jp: string | null;
  category: string | null;
  category_jp: string | null;
  flood_depth_rank: number | null;
  flood_depth: string | null;
  storm_surge_depth_rank: number | null;
  storm_surge_depth: string | null;
  flood_duration_rank: number | null;
  flood_duration: string | null;
  inland_waters_depth_rank: number | null;
  inland_waters_depth: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}
