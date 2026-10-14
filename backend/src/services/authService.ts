import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { signToken, type JwtConfig } from '../utils/jwt';
import { toUserDto, type UserDto } from '../utils/serializers';
import type { LoginInput, SignupInput } from '../validators/auth';

const BCRYPT_ROUNDS = 10;
// Compared against when the email does not exist, so a login attempt takes
// about the same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export interface AuthResult {
  token: string;
  user: UserDto;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export async function signup(input: SignupInput, jwt: JwtConfig): Promise<AuthResult> {
  const emailTaken = await User.exists({ email: input.email });
  if (emailTaken) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const user = await User.create({ name: input.name, email: input.email, passwordHash, role: input.role });
    return { token: signToken({ id: user.id, role: user.role }, jwt), user: toUserDto(user) };
  } catch (err) {
    // Two signups with the same email at the same moment: the unique index wins.
    if (isDuplicateKeyError(err)) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

export async function login(input: LoginInput, jwt: JwtConfig): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return { token: signToken({ id: user.id, role: user.role }, jwt), user: toUserDto(user) };
}

export async function getUserById(id: string): Promise<UserDto> {
  const user = await User.findById(id);
  if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Your account no longer exists. Please sign up again.');
  return toUserDto(user);
}
