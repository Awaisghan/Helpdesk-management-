import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db/connect';
import { apiError } from '@/lib/api-response';
import { registrationSchema } from '@/lib/validation/auth';
import { UserModel } from '@/models';
import { jsonNoStore } from '@/lib/http';
import { safeUser } from '@/lib/format';
export async function POST(request: Request) {
  try {
    const body = registrationSchema.parse(await request.json());
    await connectToDatabase();
    if (await UserModel.exists({ email: body.email })) return jsonNoStore({ error: 'An account with that email already exists.' }, { status: 409 });
    const hashedPassword = await bcrypt.hash(body.password, 12);
    const user = await UserModel.create({ name: body.name, email: body.email, hashedPassword, role: 'User', isActive: true });
    return jsonNoStore({ user: safeUser(user.toObject()) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
