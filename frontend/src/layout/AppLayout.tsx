import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChartBar,
  IconLogout,
  IconPercentage,
  IconShoppingCart,
} from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const nav = [
  { to: '/analytics', label: 'Analytics', icon: IconChartBar },
  { to: '/promocodes', label: 'Promocodes', icon: IconPercentage },
  { to: '/orders', label: 'Orders', icon: IconShoppingCart },
];

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700}>PromoCode Manager</Text>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            href={item.to}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.5} />}
            active={location.pathname === item.to}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.to);
            }}
          />
        ))}
        <NavLink
          label="Logout"
          leftSection={<IconLogout size={18} stroke={1.5} />}
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          mt="xl"
          color="red"
        />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
