import { asset } from '../lib/runtime';

/** Canonical flat symbol (cobalt variant), inline so the eyes can blink. Geometry copied from the supplied SVG. */
export function ClunkMark({ className = 'brand__mark', variant = 'cobalt', title }: { className?: string; variant?: 'cobalt' | 'ink'; title?: string }) {
  const body = variant === 'cobalt' ? '#3558DC' : '#252522';
  return (
    <svg className={className} viewBox="0 0 256 280" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect x="121" y="28" width="44" height="31" rx="5" transform="rotate(-5 143 43)" fill={body} />
      <path
        d="M134 53 C174 47 202 60 213 86 C223 111 207 136 180 140 L151 141 C136 141 123 150 123 163 C123 178 137 187 153 187 L168 187 C193 187 212 200 214 219 Q216 231 204 234 L185 234 L185 245 Q185 254 176 254 L160 254 Q151 254 151 245 L151 235 L103 235 L103 245 Q103 254 94 254 L78 254 Q69 254 69 245 L69 232 C49 224 40 205 40 178 L40 139 C40 91 69 63 103 56 Z"
        fill={body}
      />
      <g className="blink">
        <rect x="126" y="89" width="21" height="24" rx="4" fill="#F3EBDD" />
        <circle cx="178" cy="101" r="12" fill="#F3EBDD" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = 'brand__word' }: { className?: string }) {
  return <img className={className} src={asset('brand/clunk-wordmark-ink.svg')} alt="Clunk" width={84} height={32} />;
}

export function Loop({ draw = true, className = '' }: { draw?: boolean; className?: string }) {
  return (
    <svg className={`loop ${draw ? 'loop--draw' : ''} ${className}`} viewBox="0 0 500 200" aria-hidden="true">
      <path d="M25 105 C-10 165 45 175 111 136 C171 99 146 55 92 87 C-2 143 108 177 192 132 C284 83 299 40 226 80 C137 131 207 184 319 131 C384 100 414 118 467 130" fill="none" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function Stamp({ className = 'stamp' }: { className?: string }) {
  return <img className={className} src={asset('brand/clunk-stamp.svg')} alt="" />;
}

export function Mascot({ alive = true, className = '' }: { alive?: boolean; className?: string }) {
  return (
    <img
      className={`mascot ${alive ? 'mascot--alive' : ''} ${className}`}
      src={asset('brand/clunk-mascot-1100.webp')}
      srcSet={`${asset('brand/clunk-mascot-640.webp')} 640w, ${asset('brand/clunk-mascot-1100.webp')} 1100w`}
      sizes="(max-width: 860px) 80vw, 460px"
      width={1100}
      height={733}
      alt="Clunk, a cream C-shaped character with a cobalt crown tab, one square eye and one round eye, standing on two feet."
    />
  );
}

/** One shared cover: never load an unrevealed identity's image into the browser. */
export function ConcealedIdentity() {
  return <div className="nft-concealed" role="img" aria-label="Unrevealed Clunk Identity">
    <img className="nft-concealed__haze" src={asset('brand/clunk-token-cobalt.svg')} alt="" aria-hidden="true"/>
    <ClunkMark className="nft-concealed__mark"/>
    <span className="nft-concealed__label">SEALED IDENTITY</span>
  </div>;
}

/** Non-vault illustrations remain concealed; never infer ownership from example IDs. */
export function IdentityTile({ id, label }: { id: number; label?: string }) {
  return <div className="identity-tile identity-tile--collection" role="img" aria-label={label ?? `Clunk #${String(id).padStart(3, '0')}`}>
    <span className="identity-tile__no">#{String(id).padStart(3, '0')}</span>
    <ConcealedIdentity/>
  </div>;
}
