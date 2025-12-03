import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { listShelters, findShelterByShareCode } from "../services/shelterService.js";
import { listQuestionAttributes } from "../services/questionAttributeService.js";
import { ApiError } from "../services/errors.js";

const sheltersRoutes: FastifyPluginAsync = async (fastify) => {
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
