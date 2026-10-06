import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container section empty">
      <h1>This page couldn’t be found.</h1>
      <p>The request may have moved or is awaiting approval.</p>
      <Link className="button" href="/campaigns">
        Explore blood requests
      </Link>
    </div>
  );
}
