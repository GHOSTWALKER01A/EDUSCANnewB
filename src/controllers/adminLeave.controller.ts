import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError }     from '../utils/ApiError.js';
import { ApiResponse }  from '../utils/ApiResponse.js';

/**
 * Minimal in-memory leave store for now.
 * Replace with a real Mongoose model (LeaveModel) when the schema is available.
 */
interface LeaveRecord {
  _id:    string;
  name:   string;
  type:   string;
  date:   string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// In production this would be replaced by LeaveModel.find(...)
const leaveStore: LeaveRecord[] = [
  { _id: '1', name: 'John Doe',      type: 'Sick Leave',     date: '2024-05-10', reason: 'Flu',             status: 'Pending'  },
  { _id: '2', name: 'Emma Johnson',  type: 'Personal Leave', date: '2024-05-12', reason: 'Family Event',    status: 'Approved' },
  { _id: '3', name: 'Alex Smith',    type: 'Vacation',       date: '2024-06-01', reason: 'Trip to Shimla',  status: 'Rejected' },
];

// GET /api/admin/leaves
export const getLeaves = asyncHandler(async (_req: Request, res: Response) => {
  // When a real model is ready: const leaves = await LeaveModel.find().sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { leaves: leaveStore }, 'Leave applications fetched'));
});

// PATCH /api/admin/leaves/:id/status
export const updateLeaveStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id }     = req.params;
  const { status } = req.body as { status: string };

  const valid = ['Approved', 'Rejected'];
  if (!valid.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${valid.join(', ')}`);
  }

  // When a real model is ready:
  // const leave = await LeaveModel.findByIdAndUpdate(id, { status }, { new: true });
  const leave = leaveStore.find(l => l._id === id);
  if (!leave) throw new ApiError(404, 'Leave application not found');

  leave.status = status as LeaveRecord['status'];
  return res.status(200).json(new ApiResponse(200, leave, `Leave application ${status.toLowerCase()}`));
});
