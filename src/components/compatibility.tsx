'use client';
import { useState } from 'react';
import { bloodGroups, compatibility, compatible } from '@/lib/domain';
export default function CompatibilityTool() {
  const [group, setGroup] = useState('O+');
  return (
    <div className="panel compatibility-tool">
      <label>
        Choose your blood group
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          {bloodGroups.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      <div className="compat-grid">
        <div>
          <p className="eyebrow">YOU CAN DONATE RED CELLS TO</p>
          <div className="blood-tags">
            {bloodGroups
              .filter((b) => compatible(group, b))
              .map((b) => (
                <span className="blood-tag" key={b}>
                  {b}
                </span>
              ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">YOU CAN RECEIVE RED CELLS FROM</p>
          <div className="blood-tags">
            {compatibility[group].map((b) => (
              <span className="blood-tag" key={b}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
