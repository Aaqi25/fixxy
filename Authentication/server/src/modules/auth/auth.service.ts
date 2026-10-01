import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authRepository, AuthRepository } from './auth.repository';
import {
  AuthTokenPayload,
  LoginInput,
  RegisterInput,
  SafeStudentDto,
} from './auth.types';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, errors?: Record<string, string>) {
    super(400, message, errors);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  /**
   * Validates registration input fields according to FIXXY requirements.
   */
  validateRegisterInput(input: RegisterInput): { name: string; email: string; password: string } {
    const errors: Record<string, string> = {};

    const rawName = input?.name ?? '';
    const rawEmail = input?.email ?? '';
    const rawPassword = input?.password ?? '';

    const name = rawName.trim();
    if (!name) {
      errors.name = 'Name is required';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (name.length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }

    const email = rawEmail.trim().toLowerCase();
    if (!email) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Enter a valid email address';
    }

    if (!rawPassword) {
      errors.password = 'Password is required';
    } else if (rawPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Za-z]/.test(rawPassword) || !/[0-9]/.test(rawPassword)) {
      errors.password = 'Password must contain at least one letter and one number';
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Invalid registration input', errors);
    }

    return { name, email, password: rawPassword };
  }

  /**
   * Validates login input fields.
   */
  validateLoginInput(input: LoginInput): { email: string; password: string } {
    const errors: Record<string, string> = {};

    const rawEmail = input?.email ?? '';
    const rawPassword = input?.password ?? '';

    const email = rawEmail.trim().toLowerCase();
    if (!email) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Enter a valid email address';
    }

    if (!rawPassword) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestError('Invalid login input', errors);
    }

    return { email, password: rawPassword };
  }

  /**
   * Registers a new student.
   * Checks for duplicate email, hashes the password, and stores the student.
   */
  async register(input: RegisterInput): Promise<SafeStudentDto> {
    const { name, email, password } = this.validateRegisterInput(input);

    // Duplicate check
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email is already registered');
    }

    // Securely hash password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Save student
    const student = await this.repo.createStudent(name, email, passwordHash);

    // Return safe student information only
    return this.repo.toSafeDto(student);
  }

  /**
   * Authenticates student credentials and returns a signed JWT token and safe student info.
   */
  async login(input: LoginInput): Promise<{ student: SafeStudentDto; token: string }> {
    const { email, password } = this.validateLoginInput(input);

    const student = await this.repo.findByEmail(email);
    if (!student) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken({
      studentId: student.id,
      email: student.email,
      name: student.name,
    });

    return {
      student: this.repo.toSafeDto(student),
      token,
    };
  }

  /**
   * Retrieves safe student information by studentId.
   */
  async getStudentById(studentId: string): Promise<SafeStudentDto> {
    if (!studentId) {
      throw new UnauthorizedError('Authentication required');
    }

    const student = await this.repo.findById(studentId);
    if (!student) {
      throw new UnauthorizedError('Student account not found or deleted');
    }

    return this.repo.toSafeDto(student);
  }

  /**
   * Creates a signed JWT for the authenticated student.
   */
  generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
  }

  /**
   * Verifies a JWT token and extracts the payload.
   */
  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token expired');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }
  }
}

export const authService = new AuthService();
