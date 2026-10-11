import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

export default function Profile({ user }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <Card title="User Info">
        <p className="text-gray-700 dark:text-gray-300">
          Name: {user?.name || "Not provided"}
        </p>
        <p className="text-gray-700 dark:text-gray-300">
          Email: {user?.email || "—"}
        </p>
      </Card>
      <Card title="Security">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Your session uses short-lived access tokens with automatic refresh.</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Refresh profile</Button>
      </Card>
    </div>
  );
}
