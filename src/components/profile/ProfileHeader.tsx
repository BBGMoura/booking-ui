'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/context/AuthContext';
import { USER_ROLES } from '@/lib/types/auth';
import { getInitials } from '@/lib/utils/userUtils';

export function ProfileHeader() {
  const { user, hasRole } = useAuth();
  const initials = getInitials(user);
  const isAdmin = hasRole(USER_ROLES.ADMIN);

  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-6 p-6">
        <Avatar className="h-20 w-20 rounded-xl">
          <AvatarFallback className="bg-primary text-primary-foreground rounded-xl text-2xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
          <Badge variant={'secondary'} className="mt-1 w-fit">
            {isAdmin ? 'Admin' : 'User'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
