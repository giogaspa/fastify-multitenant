import { FastifyReply } from "fastify";
import { customAlphabet } from "nanoid";

export const idGenerator: () => string = customAlphabet('1234567890abcdefghilmnopqrstuvzxykj', 10);

export function badRequest(this: FastifyReply) {
    this.code(400).send();
}