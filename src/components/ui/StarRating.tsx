interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
}

export default function StarRating({ value, onChange, size = 'sm' }: Props) {
  const starSize = size === 'md' ? 'text-xl' : 'text-sm';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(value === i ? 0 : i)}
          className={`${starSize} ${i <= value ? 'text-yellow-400' : 'text-gray-300'} ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {i <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
