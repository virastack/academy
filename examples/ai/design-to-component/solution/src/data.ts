export type Profile = {
  id: string;
  name: string;
  role: string;
  skill: string;
  experience: string;
  rating: string;
  earned: string;
  rate: string;
  cta: string;
  avatar: string;
  cover: string;
  liked: boolean;
};

export const profiles: Profile[] = [
  {
    id: 'alexander',
    name: 'Alexander Ross',
    role: 'Motion designer',
    skill: 'UI/UX Designer',
    experience: '5+ Years',
    rating: '4.5',
    earned: '$55k+',
    rate: '$28/hr',
    cta: "Let's Connect",
    avatar: '/avatar-1.svg',
    cover: '/cover-1.svg',
    liked: true,
  },
  {
    // Uzun isim: kart taşmamalı
    id: 'maria',
    name: 'Maria Fernanda Gutiérrez-Hernández de la Vega',
    role: 'Senior frontend developer',
    skill: 'React & TypeScript',
    experience: '8+ Years',
    rating: '4.9',
    earned: '$120k+',
    rate: '$65/hr',
    cta: "Let's Connect",
    avatar: '/avatar-2.svg',
    cover: '/cover-2.svg',
    liked: false,
  },
  {
    id: 'sam',
    name: 'Sam Lee',
    role: 'Illustrator',
    skill: 'Brand Illustration',
    experience: '2+ Years',
    rating: '4.2',
    earned: '$8k+',
    rate: '$18/hr',
    cta: "Let's Connect",
    avatar: '/avatar-3.svg',
    cover: '/cover-3.svg',
    liked: false,
  },
];
