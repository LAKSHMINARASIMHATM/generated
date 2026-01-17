import { Response } from 'express';
// Updated to use .tsx extension to resolve module not found error
import { mockBackend } from '../mockBackend.tsx';

// Using any for req and res to resolve Property 'body', 'status' and 'json' missing errors
export const signup = async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    const user = await mockBackend.auth.signup(name, email);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await mockBackend.auth.login(email);
    res.json(user);
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

export const getMe = async (req: any, res: any) => {
  try {
    const user = mockBackend.auth.getMe();
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};