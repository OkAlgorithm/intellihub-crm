import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const events = [
  { id: 1, title: "Client Meeting", time: "10:00 AM", date: new Date(2025, 9, 10) },
  { id: 2, title: "Project Review", time: "2:00 PM", date: new Date(2025, 9, 10) },
  { id: 3, title: "Site Visit", time: "9:00 AM", date: new Date(2025, 9, 12) },
];

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and appointments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{event.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold">Oct 5 – 11, 2025</span>
                    <Button variant="outline" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm">
                    Today
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={view === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView("day")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={view === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Week View */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-8 border-b bg-muted/30">
                  <div className="p-2 text-xs font-medium text-muted-foreground">Time</div>
                  {daysOfWeek.map((day, i) => (
                    <div key={i} className="p-2 text-center border-l">
                      <div className="text-xs font-medium">{day}</div>
                      <div className="text-lg font-semibold text-muted-foreground">
                        {5 + i}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="max-h-[600px] overflow-y-auto">
                  {hours.filter(h => h >= 6 && h <= 20).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b">
                      <div className="p-2 text-xs text-muted-foreground border-r">
                        {hour % 12 || 12}:00 {hour < 12 ? 'AM' : 'PM'}
                      </div>
                      {daysOfWeek.map((_, dayIndex) => (
                        <div key={dayIndex} className="p-2 border-l min-h-[60px] hover:bg-muted/30 cursor-pointer">
                          {/* Event would go here */}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
