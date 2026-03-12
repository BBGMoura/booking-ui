'use client';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { login, checkInvite, fetchCurrentUser, logout, register } from '@/lib/api/auth';

export default function Home() {
  const { user, isAuthenticated, isLoading, error, login, logout } = useAuth();

  // async function testLogin() {
  //   const result = await login({ email: 'admin@acs.com', password: 'Aa123456!' });
  //   console.log('LOGIN RESULT:', result);
  // }
  //
  // async function testCheckInvite() {
  //   const result = await checkInvite('invited@email.com');
  //   console.log('CHECK INVITE RESULT:', result);
  // }
  //
  // async function testGetCurrentUser() {
  //   const result = await getCurrentUser();
  //   console.log('CURRENT USER:', result);
  // }
  //
  // function testLogout() {
  //   logout();
  //   console.log('LOGGED OUT');
  // }

  async function testRegister() {
    try {
      const result = await register({
        firstName: 'Jane',
        lastName: '',
        email: 'invited@examplecom', // must be an email your admin has actually invited
        phoneNumber: '456789',
        password: 'Password',
      });
      console.log('REGISTER RESULT:', result);
    } catch (error) {
      console.error('REGISTER ERROR:', error);
    }
  }

  async function testLogin() {
    await login({ email: 'admin@acscom', password: 'Aa123456!' });
    console.log('User after login:', user);
  }

  return (
    <>
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p>Is authenticated: {String(isAuthenticated)}</p>
        <p>Is loading: {String(isLoading)}</p>
        <p>User: {user ? user.email : 'nobody'}</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button onClick={testLogin} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Test Login'}
        </button>
        <button onClick={logout}>Test Logout</button>
      </div>
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/*  <button onClick={testLogin}>Test Login</button>*/}
        {/*  <button onClick={testCheckInvite}>Test Check Invite</button>*/}
        {/*  <button onClick={testGetCurrentUser}>Test Get Current User</button>*/}
        {/*  <button onClick={testLogout}>Test Logout</button>*/}
        <button onClick={testRegister}>Test Register</button>
      </div>
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <ButtonGroup>
            <Button size="icon" variant="outline">
              <ChevronLeft />
            </Button>
            <Button variant="outline"> Today </Button>
            <Button size="icon" variant="outline">
              <ChevronRight />
            </Button>
          </ButtonGroup>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Bookings" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Bookings</SelectLabel>
                <SelectItem value="My Bookings">My Bookings</SelectItem>
                <SelectItem value="Astaire">Astaire</SelectItem>
                <SelectItem value="Alex Moore">Alex Moore</SelectItem>
                <SelectItem value="Bussell">Bussell</SelectItem>
                <SelectItem value="Fosse">Fosse</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button variant="outline">Book</Button>
        </div>
      </div>
    </>
  );
}
