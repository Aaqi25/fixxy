export interface Student {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudentWithPassword extends Student {
  password_hash: string;
}

export interface SafeStudentDto {
  id: string;
  name: string;
  email: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  studentId: string;
  email: string;
  name: string;
}

export interface RegisterResponse {
  message: string;
  student: SafeStudentDto;
}

export interface LoginResponse {
  message: string;
  student: SafeStudentDto;
}

export interface MeResponse {
  student: SafeStudentDto;
}

export interface LogoutResponse {
  message: string;
}

export interface AuthErrorResponse {
  message: string;
  errors?: Record<string, string>;
}
