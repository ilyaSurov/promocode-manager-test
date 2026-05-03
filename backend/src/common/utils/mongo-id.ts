import { Types } from 'mongoose';

export function mongoIdToString(id: Types.ObjectId | string): string {
  return typeof id === 'string' ? id : id.toHexString();
}
