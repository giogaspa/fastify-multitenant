import { customAlphabet } from "nanoid";

export const idGenerator: () => string = customAlphabet('1234567890abcdefghilmnopqrstuvzxykj', 10);