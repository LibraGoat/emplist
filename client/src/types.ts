export interface User {
  id: number;
  email: string;
}

export interface Employee {
  id: number;
  fullName: string;
  position: string;
  department: string;
  createdAt: string;
}

export interface NewEmployee {
  fullName: string;
  position: string;
  department: string;
}