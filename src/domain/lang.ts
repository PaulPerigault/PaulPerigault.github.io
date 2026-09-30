import { Schema } from 'effect';

export const Lang = Schema.Literal('fr', 'en');
export type Lang = typeof Lang.Type;
