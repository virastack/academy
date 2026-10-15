import { useState } from 'react';
import type { Profile } from './data';

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className="text-heart">
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.3 1.1 4 2.3h4C14.7 6.1 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-lg font-semibold break-words text-ink">{value}</dd>
    </div>
  );
}

export default function UserCard({ profile }: { profile: Profile }) {
  const [liked, setLiked] = useState(profile.liked);

  return (
    <article className="w-full max-w-sm rounded-[2rem] bg-card p-2 font-sans shadow-card">
      <div className="relative">
        <img src={profile.cover} alt="" className="h-48 w-full rounded-3xl object-cover" />
        <img
          src={profile.avatar}
          alt={`${profile.name} profil fotoğrafı`}
          className="absolute -bottom-10 left-4 size-20 rounded-full border-4 border-card object-cover"
        />
      </div>

      <div className="px-4 pt-14 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-medium break-words text-ink">{profile.name}</h2>
            <p className="mt-1 text-muted">{profile.role}</p>
          </div>
          <button
            type="button"
            aria-pressed={liked}
            aria-label={`${profile.name} favorilere ekle`}
            onClick={() => setLiked((v) => !v)}
            className="grid size-11 shrink-0 place-items-center rounded-full"
          >
            <Heart filled={liked} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink">
          <span className="rounded-full bg-chip px-4 py-2 font-medium">{profile.skill}</span>
          <span>{profile.experience}</span>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat value={profile.rating} label="Ratings" />
          <Stat value={profile.earned} label="Earned" />
          <Stat value={profile.rate} label="Rate" />
        </dl>

        <button
          type="button"
          className="mt-6 h-14 w-full rounded-full bg-ink px-4 font-medium text-card"
        >
          {profile.cta}
        </button>
      </div>
    </article>
  );
}
