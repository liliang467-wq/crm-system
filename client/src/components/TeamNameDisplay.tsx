/**
 * Renders a team name with the parenthetical part (二级部门) in smaller text.
 * Input format: "业务一组（事业一部）" → renders "业务一组" in normal size + "（事业一部）" in smaller/muted text
 */
export default function TeamNameDisplay({
  name,
  className = "",
  highlight = false,
}: {
  name: string;
  className?: string;
  highlight?: boolean;
}) {
  // Match Chinese full-width parentheses（）or half-width ()
  const match = name.match(/^(.+?)([\uff08\(].+?[\uff09\)])$/);
  if (!match) {
    return <span className={className}>{name}</span>;
  }

  const mainName = match[1];
  const subName = match[2];

  return (
    <span className={className}>
      <span className={highlight ? "text-primary font-semibold" : ""}>{mainName}</span>
      <span className="text-[0.7em] text-muted-foreground ml-0.5">{subName}</span>
    </span>
  );
}
