export default function Avatar({ url, name, size = 96 }: { url?: string | null; name: string; size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${name} profile photo`} className="av-img" draggable={false} />
      ) : (
        <b>{name[0]?.toUpperCase() ?? "?"}</b>
      )}
    </span>
  );
}
