import { MyBookingsList } from '@/components/bookings/MyBookingsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyBookingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <MyBookingsList tab="upcoming" />
        </TabsContent>
        <TabsContent value="past">
          <MyBookingsList tab="past" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
