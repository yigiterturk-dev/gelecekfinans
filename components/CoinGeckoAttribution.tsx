export default function CoinGeckoAttribution({ className = "" }: { className?: string }) {
  return (
    <a
      className={`coingecko-attribution${className ? ` ${className}` : ""}`}
      href="https://www.coingecko.com/en/api"
      target="_blank"
      rel="noopener noreferrer"
    >
      Data provided by CoinGecko
    </a>
  );
}
