'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { getNavButtonClass, getNavItemsByRole } from '@/utils/header-nav-utils';

/**
 * NavLinks component
 *
 * Dynamically renders navigation buttons based on the user's role.
 */
type NavLinksProps = {
  readonly onNavigate?: () => void;
};

const NavLinks = ({ onNavigate }: NavLinksProps) => {
  const pathname = usePathname();
  const { userRoleStudent, userRoleAuthorized, userRoleRater, userRoleDev } = useUser();

  const link = (href: string, label: string) => (
    <Link key={`${href}-${label}`} href={href} className={getNavButtonClass(pathname, href)} onClick={onNavigate}>
      {label}
    </Link>
  );

  const links = getNavItemsByRole({
    userRoleStudent,
    userRoleAuthorized,
    userRoleRater,
    userRoleDev,
  }).map((item) => link(item.href, item.label));

  return <>{links}</>;
};

export default NavLinks;
