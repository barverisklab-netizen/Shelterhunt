import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { listShelters, findShelterByShareCode } from "../services/shelterService.js";
import { listQuestionAttributes } from "../services/questionAttributeService.js";
import { ApiError } from "../services/errors.js";

const noCityQuerySchema = z
  .object({
    city: z.never().optional(),
    cityId: z.never().optional(),
    city_id: z.never().optional(),
  })
  .passthrough();

const sheltersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", async (request) => {
    const parsed = noCityQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      throw new ApiError(400, "City is fixed by deployment and cannot be passed as a query parameter");
    }
  });

  fastify.get("/shelters", async () => {
    const shelters = await listShelters();
    return { shelters };
  });

  fastify.get("/question-attributes", async () => {
    const attributes = await listQuestionAttributes();
    return { attributes };
  });

  fastify.get("/shelters/:code", async (request, reply) => {
    const params = z.object({ code: z.string().min(1) }).parse(request.params);
    const shelter = await findShelterByShareCode(params.code);

    if (!shelter) {
      throw new ApiError(404, "Shelter not found");
    }

    reply.send({ shelter });
  });
};

export default sheltersRoutes;
