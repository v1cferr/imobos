import { redirect } from "next/navigation";

// The home of ImobOS is the daily view; the proxy sends visitors without a session to /login.
export default function Home() {
  redirect("/today");
}
