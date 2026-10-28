import UserCard from './UserCard';
import { profiles } from './data';

export default function App() {
  return (
    <main className="min-h-screen bg-page px-4 py-10 font-sans">
      <h1 className="mb-8 text-center text-2xl font-semibold text-ink">Profile cards</h1>
      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-center gap-6">
        {profiles.map((p) => (
          <UserCard key={p.id} profile={p} />
        ))}
      </div>
    </main>
  );
}
