export function serializeId(value: unknown) { return String(value); }
export function safeUser<T extends { _id: unknown }>(user: T) {
  const result={...user} as Record<string,unknown>;
  const id=String(result._id);
  delete result._id; delete result.__v; delete result.hashedPassword;
  return {...result,id};
}
