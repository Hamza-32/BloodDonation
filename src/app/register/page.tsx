import Image from 'next/image';
import Link from 'next/link';
import { PortalForm } from '@/components/forms';
import { bloodGroups } from '@/lib/domain';
export const metadata = { title: 'Join our community' };
export default function Register() {
  return (
    <div className="container auth-layout">
      <div className="auth-story">
        <p className="eyebrow">MAKE YOUR KINDNESS COUNT</p>
        <h1>
          A community
          <br />
          with room
          <br />
          for <span>you.</span>
        </h1>
        <p>Join as a donor, request blood for a patient, or connect your hospital or blood bank.</p>
        <Image
          loading="eager"
          width={900}
          height={650}
          unoptimized
          src="/images/care.svg"
          alt="Illustration of people connecting through care"
        />
        <p className="small-note">
          Hospital and blood bank accounts require administrator approval before creating requests
          or managing inventory.
        </p>
      </div>
      <div className="auth-panel panel">
        <h2>Let’s make a difference.</h2>
        <p className="muted">Create your account. It only takes a moment.</p>
        <PortalForm
          endpoint="/api/auth/register"
          button="Create my account"
          fields={[
            { name: 'name', label: 'Full name / organization' },
            { name: 'email', label: 'Email address', type: 'email' },
            {
              name: 'phone',
              label: 'Phone number',
              type: 'tel',
              hint: '10–15 digits, optional leading +',
            },
            { name: 'city', label: 'City' },
            {
              name: 'bloodGroup',
              label: 'Blood group',
              options: bloodGroups.map((value) => ({ value, label: value })),
            },
            {
              name: 'role',
              label: 'I’m joining as',
              options: [
                { value: 'DONOR', label: 'Blood donor' },
                { value: 'PATIENT', label: 'Patient / recipient' },
                { value: 'HOSPITAL', label: 'Hospital' },
                { value: 'BLOOD_BANK', label: 'Blood bank' },
              ],
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              hint: '12+ characters with uppercase, lowercase, number, and symbol.',
            },
            {
              name: 'license',
              label: 'Organization license',
              required: false,
              hint: 'Required for hospitals and blood banks.',
            },
            { name: 'address', label: 'Organization address', required: false },
          ]}
        />
        <p className="auth-bottom">
          Already part of the community? <Link href="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
