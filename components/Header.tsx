/**
 * Header legacy wrapper — delega en AppHeader del design system.
 */
import React from 'react';
import { AppHeader, type AppHeaderProps } from '@/design-system/components/AppHeader';

export type HeaderProps = AppHeaderProps;

export default function Header(props: HeaderProps) {
  return <AppHeader titleRole="h3" {...props} />;
}
