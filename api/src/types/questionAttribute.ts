export interface QuestionAttributeRecord {
  id: string;
  label: string;
  kind: "number" | "select";
  options: (string | number)[];
}
