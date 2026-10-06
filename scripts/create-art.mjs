import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('public/images', { recursive: true });
// Original vector artwork; self-contained so the local app needs no image service.
const person = (x, y, skin, shirt, hair, flip = false) =>
  `<g transform="translate(${x} ${y}) ${flip ? 'scale(-1 1)' : ''}"><path d="M-63 125Q-75 28-27 17L27 17Q73 32 61 125Z" fill="${shirt}"/><path d="M-40 49Q-80 68-72 106L-13 137" fill="none" stroke="${skin}" stroke-width="23" stroke-linecap="round"/><path d="M43 49Q75 78 44 106L-6 128" fill="none" stroke="${skin}" stroke-width="22" stroke-linecap="round"/><rect x="-12" y="-8" width="25" height="36" rx="9" fill="${skin}"/><ellipse cy="-36" rx="30" ry="39" fill="${skin}"/><path d="M-31-30Q-42-86 5-78Q47-75 31-27L20-54Q-4-43-25-57L-29-23Z" fill="${hair}"/><path d="M-11-30h3m18 0h3" stroke="#463a31" stroke-width="3" stroke-linecap="round"/><path d="M-3-15q6 5 12-1" fill="none" stroke="#865d4c" stroke-width="2" stroke-linecap="round"/><path d="M-44 125L-49 240M37 125L44 240" stroke="#414e48" stroke-width="35"/><path d="M-62 241h32m12 0h40" stroke="#303b36" stroke-width="14" stroke-linecap="round"/></g>`;
const leaf = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 130V0" stroke="#6c805a" stroke-width="5"/><path d="M0 93Q-63 57-33 28Q0 44 0 93M0 67Q62 21 31 0Q0 13 0 67" fill="#9cab7b"/><path d="M0 36Q-43 1-24-16Q0-1 0 36" fill="#748e65"/><path d="M-30 130h60l-8 70h-43Z" fill="#c58f6c"/></g>`;
const base = (bg, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><rect width="900" height="650" fill="${bg}"/>${content}<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".035"/></feComponentTransfer></filter><rect width="900" height="650" filter="url(#grain)" opacity=".5"/></svg>`;
const room = `<rect y="475" width="900" height="175" fill="#d1cabb"/><path d="M0 476h900" stroke="#bcb6a6" stroke-width="3"/><rect x="485" y="50" width="300" height="350" rx="150" fill="#faf6e8"/><path d="M635 53v347M486 220h295" stroke="#e1dacb" stroke-width="8"/><path d="M500 350q65-40 140-15t140-25v90H500Z" fill="#e6ead5"/><rect x="50" y="94" width="110" height="147" rx="3" fill="#efe9db" stroke="#beb7a7" stroke-width="6"/><path d="M75 170h60M105 140v60" stroke="#b2bf94" stroke-width="13"/><rect x="167" y="390" width="566" height="32" rx="10" fill="#9a967f"/><path d="M205 422v100m489-100v100" stroke="#878e7a" stroke-width="12"/>`;
writeFileSync(
  'public/images/hero.svg',
  base(
    '#e0ddcf',
    `${room}${leaf(813, 320, 0.8)}${person(300, 280, '#bf8d6e', '#839978', '#332e2a')}${person(590, 280, '#e0ae8a', '#eee9dc', '#444039', true)}<path d="M307 407q130 42 270 1" fill="none" stroke="#b9876b" stroke-width="23" stroke-linecap="round"/><circle cx="449" cy="420" r="18" fill="#d3a182"/><rect x="570" y="350" width="25" height="17" rx="3" fill="#789c87"/><path d="M579 351v15m-6-7h14" stroke="#f4f4e6" stroke-width="3"/><g transform="translate(427 214)"><circle r="36" fill="#f7f3e5"/><path d="M-16-3q0-20 16-9q16-11 16 9q-2 11-16 22q-14-11-16-22" fill="#b97258"/></g>`,
  ),
);
writeFileSync(
  'public/images/care.svg',
  base(
    '#dce1d0',
    `<circle cx="690" cy="210" r="165" fill="#eaf0df"/><rect x="80" y="80" width="260" height="320" rx="130" fill="#f4f2e6"/><rect y="505" width="900" height="150" fill="#c7cebb"/>${leaf(795, 350, 0.7)}${person(325, 285, '#bd8d70', '#849c80', '#373b2f')}${person(555, 285, '#d9aa84', '#eceade', '#3d352b', true)}<path d="M310 414h260" stroke="#cda081" stroke-width="24" stroke-linecap="round"/><rect x="660" y="95" width="99" height="128" rx="5" fill="#f6f1e2"/><path d="M680 155h59m-30-29v58" stroke="#acb995" stroke-width="12"/>`,
  ),
);
writeFileSync(
  'public/images/children.svg',
  base(
    '#e8d8c4',
    `<circle cx="200" cy="250" r="165" fill="#f2e5d5"/><circle cx="700" cy="180" r="135" fill="#efdcc9"/><rect y="490" width="900" height="160" fill="#d5c3aa"/>${leaf(785, 340, 0.7)}${person(355, 305, '#c59472', '#bc8d71', '#3b332b')}${person(565, 315, '#d8aa82', '#9ba683', '#423930', true)}<g transform="translate(470 235) scale(.63)">${person(0, 170, '#c69573', '#d7b35f', '#3a342c')}</g><path d="M105 151l21-35 19 35" fill="#b5bd95"/><circle cx="756" cy="385" r="22" fill="#b88b72"/>`,
  ),
);
writeFileSync(
  'public/images/surgery.svg',
  base(
    '#d4dfe0',
    `<rect x="470" y="70" width="300" height="340" rx="12" fill="#eaf0e9"/><path d="M620 70v340M470 235h300" stroke="#b9cace" stroke-width="7"/><rect y="490" width="900" height="160" fill="#b6c8c7"/><rect x="150" y="355" width="525" height="70" rx="25" fill="#ecefe6"/><path d="M180 425v105m450-105v105" stroke="#8faaa7" stroke-width="13"/>${person(340, 270, '#d7a17e', '#83a6a3', '#42433a')}${person(605, 280, '#b9896c', '#e4e8df', '#403b33', true)}<rect x="44" y="104" width="133" height="155" rx="5" fill="#e6ece3" stroke="#9fb6b4" stroke-width="5"/><path d="M71 184h79m-40-40v80" stroke="#89a39b" stroke-width="18"/><path d="M760 166v285m-38 0h75M744 200h32v80h-32Z" stroke="#7d9c99" stroke-width="6" fill="#dcebe1"/>`,
  ),
);
writeFileSync(
  'public/images/community.svg',
  base(
    '#d8dfc6',
    `<circle cx="450" cy="260" r="235" fill="#eaf0d9"/><rect y="500" width="900" height="150" fill="#c2ccb0"/>${leaf(80, 310, 0.8)}${leaf(800, 310, 0.8)}${person(300, 295, '#c39170', '#e2b389', '#38382d')}${person(600, 295, '#d7a780', '#839676', '#3c342c', true)}<g transform="translate(0 40)">${person(450, 270, '#ba896e', '#bbc39a', '#373c2b')}</g><path d="M230 88q95-42 185-4m85 0q95-30 170 0" fill="none" stroke="#c5ac79" stroke-width="3"/><path d="M260 78l28 12-24 33m70-51l28 7-19 33m194-38l28 9-21 33m74-29l25 12-23 29" fill="#bca17b"/>`,
  ),
);
console.info('Created five original, self-contained vector illustrations.');
