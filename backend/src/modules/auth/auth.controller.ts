import { asyncHandler } from '../../utils/asyncHandler';
// Updated to use .tsx extension to resolve module not found error
import { mockBackend } from '../../../../mockBackend.tsx';
import { signToken } from '../../config/jwt';

export const signup = asyncHandler(async (req: any, res: any) => {
  const { name, email } = req.body;
  const user = await mockBackend.auth.signup(name, email);
  const token = signToken({ id: user.id });
  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  const user = await mockBackend.auth.login(email);
  const token = signToken({ id: user.id });
  res.status(200).json({ user, token });
});

export const getMe = asyncHandler(async (req: any, res: any) => {
  const user = mockBackend.auth.getMe();
  res.status(200).json(user);
});