import { AdminService } from './admin.service';

// The admin edit dialog (user-management.component.ts `openEdit`) is opened straight
// from a list row, so every field it populates must come back from getUsers(). It read
// `u.idNumber ?? ''`, which the list never selected — a stored ID rendered as blank.
const FIELDS_THE_EDIT_DIALOG_READS = [
  'id',
  'fullName',
  'email',
  'phone',
  'nationality',
  'idNumber',
  'role',
  'status',
  'profileImage',
];

function makePrisma() {
  return {
    user: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
}

describe('AdminService.getUsers', () => {
  it('selects every field the admin edit dialog populates', async () => {
    const prisma = makePrisma();
    const service = new AdminService(prisma, {} as any);

    await service.getUsers();

    const select = prisma.user.findMany.mock.calls[0][0].select;
    for (const field of FIELDS_THE_EDIT_DIALOG_READS) {
      expect(select[field]).toBe(true);
    }
  });

  it('selects the driver licence number the edit dialog reads', async () => {
    const prisma = makePrisma();
    const service = new AdminService(prisma, {} as any);

    await service.getUsers();

    const select = prisma.user.findMany.mock.calls[0][0].select;
    expect(select.driverProfile.select.licenseNumber).toBe(true);
  });
});
