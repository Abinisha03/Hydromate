import { Stack } from 'expo-router';

export default function StaffLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Staff Dashboard', headerLeft: () => null }} />
    </Stack>
  );
}
