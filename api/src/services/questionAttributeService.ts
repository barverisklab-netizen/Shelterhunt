import { pool } from "../db/pool.js";
import type { QuestionAttributeRecord } from "../types/questionAttribute.js";
import { cityQuestionIds } from "../config/cityConfig.js";

export async function listQuestionAttributes(): Promise<QuestionAttributeRecord[]> {
  const result = await pool.query<QuestionAttributeRecord>(
    `select id, label, kind, options
     from question_attributes
     where id = any($1::text[])
     order by id asc`,
    [cityQuestionIds],
  );

  const presentIds = new Set(result.rows.map((row) => row.id));
  const missingIds = cityQuestionIds.filter((id) => !presentIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(
      `Missing seeded question_attributes for deployed city questions: ${missingIds.join(", ")}`,
    );
  }

  return result.rows;
}
