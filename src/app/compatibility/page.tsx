import CompatibilityTool from '@/components/compatibility';
import { PageTitle } from '@/components/ui';
export const metadata = { title: 'Blood compatibility guide' };
export default function Guide() {
  return (
    <div className="container section narrow">
      <PageTitle
        eyebrow="A LITTLE KNOWLEDGE GOES A LONG WAY"
        title="Find your blood connection."
        description="Explore ABO and Rh red cell compatibility. Donation centers still perform blood typing, crossmatching, and clinical screening."
      />
      <CompatibilityTool />
      <div className="panel">
        <h2>Before your appointment</h2>
        <p>
          Complete your screening profile, choose an open request, and pledge an appointment. The
          portal uses a configurable 90-day minimum interval, ages 18–65, and a minimum weight of 50
          kg as its demo screening rules.
        </p>
        <p className="muted">
          These portal rules do not determine clinical eligibility. The receiving center decides
          whether a donation can proceed.
        </p>
        <p className="small-note">
          Compatibility reference:{' '}
          <a
            className="text-link"
            href="https://www.redcrossblood.org/donate-blood/blood-types.html"
            target="_blank"
            rel="noreferrer"
          >
            American Red Cross blood types guide ↗
          </a>
        </p>
      </div>
    </div>
  );
}
