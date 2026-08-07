import { Schema, model } from 'mongoose';

const exampleSchema = new Schema({ name: { type: String, required: true } });
export const Example = model('Example', exampleSchema);
