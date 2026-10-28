import bcrypt from "bcryptjs";

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, hash: string) => bcrypt.compare(p, hash);
// Used so login takes the same time whether or not the user exists
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);
