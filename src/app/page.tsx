import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  Search,
  CalendarCheck,
  HeartHandshake,
  ShieldCheck,
  Droplet,
} from 'lucide-react';
import { db } from '@/lib/db';
import { CampaignCard, TrustNote } from '@/components/ui';
export default async function Home() {
  const campaigns = await db.campaign.findMany({
    where: { status: 'ACTIVE', endDate: { gt: new Date() } },
    take: 3,
    include: { category: true, donations: { select: { status: true, units: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const [donors, donations, partners] = await Promise.all([
    db.user.count({ where: { role: 'DONOR', active: true } }),
    db.donation.count({ where: { status: 'COMPLETED' } }),
    db.organization.count({ where: { user: { approval: 'APPROVED', active: true } } }),
  ]);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> SMALL ACTS. EXTRAORDINARY IMPACT.
            </p>
            <h1>
              A little of you.
              <br />A <span>whole life</span>
              <br />
              for someone else.
            </h1>
            <p className="hero-description">
              Connect with people who need blood, find a cause close to your heart, and turn your
              kindness into someone’s next chapter.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/campaigns">
                Find a blood request <ArrowUpRight size={18} />
              </Link>
              <Link className="button outline" href="/register">
                Become a donor <Heart size={17} />
              </Link>
            </div>
            <div className="hero-social">
              <div className="avatar-stack">
                <span>HA</span>
                <span>SI</span>
                <span>RZ</span>
                <span>MC</span>
              </div>
              <div>
                <b>Good people. Greater together.</b>
                <p>Join our growing community of donors.</p>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Image
                loading="eager"
                width={900}
                height={650}
                unoptimized
                src="/images/hero.svg"
                alt="Illustration of a donor and care worker joining hands in a welcoming donation center"
              />
              <span className="photo-label">
                <span className="live-dot" /> Every drop brings hope
              </span>
            </div>
            <div className="floating-card">
              <span className="float-icon">
                <HeartPulseIcon />
              </span>
              <div>
                <b>Your kindness has a pulse.</b>
                <p>One appointment. A meaningful difference.</p>
              </div>
              <span className="float-check">
                <ShieldCheck size={22} />
              </span>
            </div>
            <div className="hero-scribble">a little care goes a long way ↗</div>
          </div>
        </div>
      </section>
      <section className="impact-bar">
        <div className="container impact-grid">
          <div>
            <strong>{donors}</strong>
            <span>registered blood donors</span>
          </div>
          <div>
            <strong>{donations}</strong>
            <span>confirmed demo donations</span>
          </div>
          <div>
            <strong>{partners}</strong>
            <span>approved care partners</span>
          </div>
          <div className="impact-message">
            <HeartHandshake size={32} />
            <span>
              Real connections.
              <br />
              <b>Lasting possibilities.</b>
            </span>
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR REASON TO GIVE</p>
            <h2>Someone needs you today.</h2>
            <p>Behind every request is a person, a family, and a future.</p>
          </div>
          <Link className="text-link" href="/campaigns">
            Explore all requests <ArrowRight size={18} />
          </Link>
        </div>
        <div className="campaign-grid">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
        <TrustNote />
      </section>
      <section className="how-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">KINDNESS, WITHOUT THE COMPLICATIONS</p>
              <h2>Three steps. One powerful difference.</h2>
            </div>
            <span className="handwritten">You have it in you.</span>
          </div>
          <div className="steps">
            {[
              {
                icon: Search,
                title: 'Find a request',
                text: 'Discover blood requests by group, location, and urgency. Find where you can help.',
              },
              {
                icon: CalendarCheck,
                title: 'Make a connection',
                text: 'Pledge an appointment. Your care partner coordinates the details and screening.',
              },
              {
                icon: HeartHandshake,
                title: 'Give a little of you',
                text: 'Visit the donation center. Once confirmed, follow your contribution in your workspace.',
              },
            ].map((s, i) => (
              <div key={s.title}>
                <span className="step-icon">
                  <s.icon size={27} />
                </span>
                <span className="step-number">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section container partner-section">
        <p className="eyebrow">A COMMUNITY OF CARE</p>
        <h2>Good hands. Shared purpose.</h2>
        <div className="partner-logos">
          <span>
            <ShieldCheck /> Dhaka Community Hospital
          </span>
          <span>
            <Droplet /> LifeLine Blood Bank
          </span>
          <span>
            <HeartHandshake /> Local donor community
          </span>
        </div>
        <p className="muted">Illustrative care partners in our local demonstration.</p>
      </section>
      <section className="container cta">
        <div>
          <p className="eyebrow">THE NEXT CHAPTER STARTS WITH YOU</p>
          <h2>
            You don’t need a cape.
            <br />
            Just a little compassion.
          </h2>
          <p>Be there for someone when it matters most.</p>
        </div>
        <Link className="button cream" href="/register">
          Join the donor community <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
function HeartPulseIcon() {
  return <Heart size={23} />;
}
