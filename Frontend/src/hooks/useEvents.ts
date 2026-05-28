import { useEffect, useState } from "react";
import { BACKEND_URL } from "../wallet";
import { SportEvent } from "../types";

export function useEvents() {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const eventsUrl = BACKEND_URL ? `${BACKEND_URL}/api/events` : "/api/events";
      const response = await fetch(eventsUrl);
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, refetch: fetchEvents };
}
