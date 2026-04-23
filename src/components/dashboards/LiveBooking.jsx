import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

export default function LiveBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    const { data } = await supabase.from("bookings").select("*");
    setBookings(data);
  }

  return (
    <div>
      {bookings.map((b) => (
        <p key={b.id}>{b.court} - {b.status}</p>
      ))}
    </div>
  );
}