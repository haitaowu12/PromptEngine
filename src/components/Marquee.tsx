export default function Marquee() {
  const tags = [
    "#cinematic", "#35mm", "#surreal", "#midjourney-v6", "#cyberpunk", 
    "#minimalist", "#macro", "#golden-hour", "#analog", "#concept-art"
  ];
  const repeatedTags = [...tags, ...tags];

  return (
    <div className="border-y border-outline-variant overflow-hidden bg-surface-container/50">
      <div className="marquee py-3">
        <p className="font-mono text-sm tracking-widest text-outline uppercase space-x-12">
          {repeatedTags.map((tag, i) => (
            <span key={i}>{tag}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
