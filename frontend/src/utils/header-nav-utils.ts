export type NavRoleState = {
  userRoleStudent: boolean;
  userRoleAuthorized: boolean;
  userRoleRater: boolean;
  userRoleDev: boolean;
};

export type NavItem = { href: string; label: string };

export function getNavItemsByRole(role: NavRoleState): NavItem[] {
  const links: NavItem[] = [];

  if (role.userRoleStudent || role.userRoleDev) {
    links.push(
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/student/form-requests', label: 'Request Assessment' },
      { href: '/dashboard/student/report', label: 'Comprehensive Report' }
    );
  }

  if (role.userRoleAuthorized || role.userRoleDev) {
    links.push(
      { href: '/dashboard', label: 'Home' },
      { href: '/dashboard/admin/userList', label: 'Manage Users' },
      { href: '/dashboard/admin/all-reports', label: 'All Reports' },
      { href: '/dashboard/admin/edit-questions-options', label: 'Edit Questions' },
      { href: '/dashboard/admin/form', label: 'Add MCQ Data' }
    );
  }

  if (role.userRoleRater && !role.userRoleAuthorized && !role.userRoleDev) {
    links.push({ href: '/dashboard', label: 'Home' });
  }

  links.push({ href: '/dashboard/AboutUsPage', label: 'About Us' });

  if (role.userRoleDev) {
    links.push({ href: '/tickets', label: 'Tickets' });
  }

  return links;
}

export function getNavButtonClass(pathname: string, href: string): string {
  return pathname === href ? 'btn btn-secondary' : 'btn btn-outline-secondary';
}
