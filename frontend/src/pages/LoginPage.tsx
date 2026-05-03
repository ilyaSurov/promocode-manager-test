import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login } from '../api/endpoints';
import { useAuth } from '../auth/AuthProvider';
import { axiosMessage } from '../utils/axios-message';

const schema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: saveAuth } = useAuth();
  const from =
    (location.state as { from?: { pathname: string } } | undefined)?.from
      ?.pathname ?? '/analytics';

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => login(v.email.trim(), v.password),
    onSuccess: (data) => {
      saveAuth(data.accessToken, data.refreshToken);
      notifications.show({
        title: 'Signed in',
        message: 'You can use the app now',
        color: 'green',
      });
      navigate(from, { replace: true });
    },
    onError: (err) => {
      notifications.show({
        title: 'Login failed',
        message: axiosMessage(err),
        color: 'red',
      });
    },
  });

  return (
    <Container size={420} my={80}>
      <Title ta="center">Welcome back</Title>
      <Text c="dimmed" size="sm" ta="center" mt={8}>
        Do not have an account?{' '}
        <Anchor component={Link} to="/register" size="sm">
          Register
        </Anchor>
      </Text>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <Stack>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <PasswordInput
                  label="Password"
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button type="submit" loading={mutation.isPending} fullWidth>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
