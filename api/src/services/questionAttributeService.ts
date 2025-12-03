import { pool } from "../db/pool.js";
import type { QuestionAttributeRecord } from "../types/questionAttribute.js";

export async function listQuestionAttributes(): Promise<QuestionAttributeRecord[]> {
  const result = await pool.query<QuestionAttributeRecord>(
    `select id, label, kind, options from public.question_attributes order by id asc`,
  );
  return result.rows;
}
