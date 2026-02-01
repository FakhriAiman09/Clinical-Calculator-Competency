'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';

/**
 * NavLinks component
 *
 * Dynamically renders navigation buttons based on the user's role.
 */
const NavLinks = () => {
  const pathname = usePathname();
  const { userRoleStudent, userRoleAuthorized, userRoleRater, userRoleDev } = useUser();

  const link = (href: string, label: string) => (
    <Link key={href} href={href} className={`btn ${pathname === href ? 'btn-secondary' : 'btn-outline-secondary'}`}>
      {label}
    </Link>
  );

  const links = [];

  // Student + Developer Links
  if (userRoleStudent || userRoleDev) {
    links.push(
      link('/dashboard', 'Dashboard'),
      link('/dashboard/student/form-requests', 'Request Assessment'),
      link('/dashboard/student/report', 'Comprehensive Report'),
      link('/dashboard/AboutUsPage', 'About Us')
    );
  }

  // Admin + Developer Links
  if (userRoleAuthorized || userRoleDev) {
    links.push(
      link('/dashboard/admin/userList', 'Manage Users'),
      link('/dashboard/admin/all-reports', 'All Reports'),
      link('/dashboard/admin/edit-questions-options', 'Edit Questions'),
      link('/dashboard/admin/form', 'Add MCQ Data'),
      link('/dashboard/AboutUsPage', 'About Us')
    );
  }

  // Rater-only view (non-admin, non-dev)
  if (userRoleRater && !userRoleAuthorized && !userRoleDev) {
    links.push(
      link('/dashboard', 'Home'),
      link('/dashboard/AboutUsPage', 'About Us')
    );
  }

  if (userRoleDev) {
    links.push(link('/tickets', 'Tickets'));
  }

  return <>{links}</>;
};

export default NavLinks;
