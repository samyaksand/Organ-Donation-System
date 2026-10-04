import type { Role, SessionUser } from '@/types/api';

/** Landing route for each role after sign-in. */
export function homePathFor(role: Role) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/admin' : '/donor';
}

export function displayNameOf(user: SessionUser) {
  if (user.donor) return `${user.donor.firstName} ${user.donor.lastName}`;
  if (user.admin) return user.admin.displayName;
  return user.email;
}
