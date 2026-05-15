type MembersToggleMode = 'manage' | 'view';

interface MembersToggleButtonProps {
  expanded: boolean;
  mode: MembersToggleMode;
  title: string;
  className: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function CollapseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M14.78 12.28a.75.75 0 01-1.06 0L10 8.56l-3.72 3.72a.75.75 0 01-1.06-1.06l4.25-4.25a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06z" clipRule="evenodd" />
    </svg>
  );
}

function ManageMembersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
    </svg>
  );
}

function ViewMembersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  );
}

export function MembersToggleButton({
  expanded,
  mode,
  title,
  className,
  onClick,
}: MembersToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={className}
      title={title}
      aria-expanded={expanded}
    >
      {expanded ? (
        <CollapseIcon />
      ) : mode === 'manage' ? (
        <ManageMembersIcon />
      ) : (
        <ViewMembersIcon />
      )}
    </button>
  );
}
