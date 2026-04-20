export type UserRole = 'student' | 'faculty' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  prn?: string;
  specialization?: string;
  semester?: string;
}

export interface Equipment {
  SIMNo: string;
  Category: string;
  Description: string;
  Qty: number;
  SerialNo: string;
  Location: string;
  ImageURL?: string;
}

export interface BookingRequest {
  RequestID: string;
  StudentName: string;
  StudentPRN: string;
  StudentEmail: string;
  EquipmentSIMNo: string;
  EquipmentDescription: string;
  Quantity: number;
  Purpose: string;
  FromDate: string;
  ReturnDate: string;
  SubmittedOn: string;
  FacultyStatus: 'Pending' | 'Approved' | 'Rejected';
  ManagerStatus: 'Pending' | 'Issued' | 'Returned';
}
