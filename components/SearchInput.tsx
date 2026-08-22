interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }: Props) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none ${className}`}
    />
  );
}
