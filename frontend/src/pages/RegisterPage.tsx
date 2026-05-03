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
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { register as registerApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthProvider';
import { axiosMessage } from '../utils/axios-message';

const schema = z.object({
  email: z.string().min(1).email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/, 'Must contain a letter')
    .regex(/[0-9]/, 'Must contain a digit'),
  name: z.string().min(1).max(120),
  phone: z
    .string()
    .min(5)
    .max(32)
    .regex(/^[+0-9()\s-]+$/, 'Invalid phone'),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login: saveAuth } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
    },
  });

  const mutation = useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      saveAuth(data.accessToken, data.refreshToken);
      notifications.show({
        title: 'Account created',
        message: 'You are signed in',
        color: 'green',
      });
      navigate('/analytics', { replace: true });
    },
    onError: (err) => {
      notifications.show({
        title: 'Registration failed',
        message: axiosMessage(err),
        color: 'red',
      });
    },
  });

  return (
    <Container size={420} my={60}>
      <Title ta="center">Create account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={8}>
        Already have an account?{' '}
        <Anchor component={Link} to="/login" size="sm">
          Sign in
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
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextInput
                  label="Name"
                  {...field}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextInput
                  label="Phone"
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
              Register
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
