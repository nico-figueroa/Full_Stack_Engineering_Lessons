import Card from "../components/ui/Card.jsx";
import { Link } from "react-router-dom";

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">PREFERENCES</p><h1 className="mt-2 text-3xl font-semibold">Settings</h1></div>
      <Card title="Appearance"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Use the appearance control in the top navigation to switch between light and dark themes. Your choice is saved in this browser.</p></Card>
      <Card title="Your routine"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Update items and schedule changes from your catalog. Intake reminders and notifications are not currently sent.</p><Link to="/items" className="mt-3 inline-block text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">Manage items →</Link></Card>
      <Card title="Privacy and safety"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Your account’s item data is scoped to your account. Reference information is fetched from public drug-label sources and is not medical advice. Do not use this organizer to make treatment decisions.</p></Card>
    </div>
  );
}
